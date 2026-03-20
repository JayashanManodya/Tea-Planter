package online.jayashan.teaplanter.service;

import lombok.RequiredArgsConstructor;
import online.jayashan.teaplanter.entity.Role;
import online.jayashan.teaplanter.entity.User;
import online.jayashan.teaplanter.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final ClerkService clerkService;

    public User getUserById(Long id) {
        return userRepository.findById(id).orElseThrow(() -> new RuntimeException("User not found: " + id));
    }

    @Transactional
    public User syncUser(String clerkId, String name, String email) {
        long userCount = userRepository.count();

        // Handle null email to avoid DB constraint violation
        String finalEmail = (email != null && !email.trim().isEmpty()) ? email : clerkId + "@clerk.missing.email";

        return userRepository.findByClerkId(clerkId)
                .map(user -> {
                    // Don't overwrite an actual name with a placeholder
                    boolean isNewNamePlaceholder = name.startsWith("User ");
                    boolean isCurrentNamePlaceholder = user.getName() == null
                            || user.getName().startsWith("User ");

                    if (!isNewNamePlaceholder || isCurrentNamePlaceholder) {
                        user.setName(name);
                    }

                    user.setEmail(finalEmail);
                    user.setPassword("CLERK_MANAGED");
                    // Sync profile photo if available (from external sync callers)
                    return userRepository.save(user);
                })
                .orElseGet(() -> {
                    Role assignRole = (userCount == 0) ? Role.OWNER : Role.WORKER;
                    User newUser = User.builder()
                            .clerkId(clerkId)
                            .name(name)
                            .email(finalEmail)
                            .password("CLERK_MANAGED")
                            .roles(new java.util.HashSet<>(java.util.List.of(assignRole)))
                            .build();
                    User saved = userRepository.save(newUser);

                    // Immediately sync the role to Clerk metadata for NEW users
                    clerkService.updateUserMetadata(clerkId, assignRole.name(), null);

                    return saved;
                });
    }

    @Transactional
    public List<User> getAvailableUsers() {
        try {
            // Fetch all users from Clerk to ensure local database is up-to-date
            java.util.List<Map<String, Object>> clerkUsers = clerkService.getClerkUsers();
            if (clerkUsers != null) {
                System.out.println("DEBUG: Fetched " + clerkUsers.size() + " users from Clerk API");
                for (Map<String, Object> clerkUser : clerkUsers) {
                    try {
                        String clerkId = (String) clerkUser.get("id");
                        if (clerkId == null)
                            continue;

                        String email = null;
                        java.util.List<Map<String, Object>> emails = (java.util.List<Map<String, Object>>) clerkUser
                                .get("email_addresses");
                        if (emails != null && !emails.isEmpty()) {
                            email = (String) emails.get(0).get("email_address");
                        }

                        String firstName = (String) clerkUser.get("first_name");
                        String lastName = (String) clerkUser.get("last_name");
                        String fullName = (firstName != null ? firstName : "")
                                + (lastName != null ? " " + lastName : "");

                        if (fullName.trim().isEmpty()) {
                            fullName = (String) clerkUser.get("username");
                        }
                        if (fullName == null || fullName.trim().isEmpty()) {
                            fullName = "User "
                                    + (clerkId.length() > 4 ? clerkId.substring(clerkId.length() - 4) : clerkId);
                        }
                        
                        String profileImageUrl = (String) clerkUser.get("image_url");

                        // Internal sync logic
                        String optimizedEmail = email != null ? email.toLowerCase() : clerkId + "@clerk.missing.email";
                        if (optimizedEmail.startsWith("no-email-")) {
                            optimizedEmail = clerkId + "@clerk.missing.email";
                        }

                        final String finalSyncEmail = optimizedEmail;
                        final String finalSyncName = fullName;

                        userRepository.findByClerkId(clerkId)
                                .map(user -> {
                                    // Sync name for existing users, but DON'T overwrite if the new name is a
                                    // placeholder
                                    // and the existing name is already an 'actual' name.
                                    boolean isNewNamePlaceholder = finalSyncName.startsWith("User ");
                                    boolean isCurrentNamePlaceholder = user.getName() == null
                                            || user.getName().startsWith("User ");

                                    if (!isNewNamePlaceholder || isCurrentNamePlaceholder) {
                                        user.setName(finalSyncName);
                                    }
                                    
                                    user.setProfileImageUrl(profileImageUrl);

                                    // Only update email if it's different and not already taken by another user
                                    if (!user.getEmail().equals(finalSyncEmail)) {
                                        // Check if the new email is already taken by a different user
                                        userRepository.findByEmail(finalSyncEmail).ifPresent(existingUser -> {
                                            if (!existingUser.getId().equals(user.getId())) {
                                                System.err.println("WARNING: Cannot update email for user "
                                                        + user.getClerkId() +
                                                        " to " + finalSyncEmail + " - email already taken by user "
                                                        + existingUser.getClerkId());
                                            }
                                        });

                                        // Only update if email is not taken by another user
                                        if (userRepository.findByEmail(finalSyncEmail).isEmpty()) {
                                            user.setEmail(finalSyncEmail);
                                        } else {
                                            User emailOwner = userRepository.findByEmail(finalSyncEmail).get();
                                            if (emailOwner.getId().equals(user.getId())) {
                                                user.setEmail(finalSyncEmail);
                                            }
                                        }
                                    }

                                    return userRepository.save(user);
                                })
                                .orElseGet(() -> {
                                    System.out.println("DEBUG: Syncing new user from Clerk: " + finalSyncName + " ("
                                            + finalSyncEmail + ")");
                                    User newUser = User.builder()
                                            .clerkId(clerkId)
                                            .name(finalSyncName)
                                            .email(finalSyncEmail)
                                            .profileImageUrl(profileImageUrl)
                                            .password("CLERK_MANAGED")
                                            .roles(new java.util.HashSet<>(java.util.List.of(Role.WORKER)))
                                            .build();
                                    return userRepository.save(newUser);
                                });
                    } catch (Exception loopEx) {
                        System.err.println("DEBUG ERROR: Failed to sync individual Clerk user: " + loopEx.getMessage());
                    }
                }
            }
        } catch (Exception ex) {
            System.err.println("DEBUG ERROR: Failed during getAvailableUsers sync: " + ex.getMessage());
        }

        List<User> available = userRepository.findAvailableUsers();
        System.out.println("DEBUG: Returning " + available.size() + " available users from DB");
        return available;
    }

    public User getUserByClerkId(String clerkId) {
        return userRepository.findByClerkId(clerkId)
                .orElseThrow(() -> new RuntimeException("User not found: " + clerkId));
    }

    @Transactional
    public void updatePin(String clerkId, String newPin) {
        if (newPin == null || newPin.length() != 6 || !newPin.matches("\\d{6}")) {
            throw new RuntimeException("PIN must be exactly 6 digits.");
        }
        User user = getUserByClerkId(clerkId);
        user.setPin(newPin);
        userRepository.save(user);
    }

    @Transactional
    public User updateProfile(String clerkId, User profileDetails) {
        User user = getUserByClerkId(clerkId);
        user.setPhone(profileDetails.getPhone());
        user.setGender(profileDetails.getGender());
        user.setBirthday(profileDetails.getBirthday());
        user.setBankName(profileDetails.getBankName());
        user.setBranchName(profileDetails.getBranchName());
        user.setAccountNumber(profileDetails.getAccountNumber());
        user.setAccountHolderName(profileDetails.getAccountHolderName());
        user.setEmergencyContact(profileDetails.getEmergencyContact());
        return userRepository.save(user);
    }
}
