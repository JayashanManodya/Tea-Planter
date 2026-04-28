package online.jayashan.teaplanter.service;

import lombok.RequiredArgsConstructor;
import online.jayashan.teaplanter.entity.OwnerSubscription;
import online.jayashan.teaplanter.entity.Plantation;
import online.jayashan.teaplanter.entity.Role;
import online.jayashan.teaplanter.entity.User;
import online.jayashan.teaplanter.repository.OwnerSubscriptionRepository;
import online.jayashan.teaplanter.repository.PlantationRepository;
import online.jayashan.teaplanter.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Netflix-style owner subscription: paid period ({@code validUntil}), grace ({@code PAYHERE_SUBSCRIPTION_GRACE_DAYS}),
 * then revoke OWNER access in DB + Clerk while keeping {@link Plantation} rows and {@link Plantation#getOwner()} intact.
 */
@Service
@RequiredArgsConstructor
public class OwnerSubscriptionLifecycleService {

    private static final Logger log = LoggerFactory.getLogger(OwnerSubscriptionLifecycleService.class);

    private final OwnerSubscriptionRepository ownerSubscriptionRepository;
    private final UserRepository userRepository;
    private final PlantationRepository plantationRepository;
    private final ClerkService clerkService;
    private final EmailService emailService;

    @Value("${PAYHERE_SUBSCRIPTION_GRACE_DAYS:1}")
    private int graceDaysAfterValidUntil;

    @Value("${PAYHERE_SUBSCRIPTION_DURATION_DAYS:30}")
    private int subscriptionDurationDays;

    public Optional<OwnerSubscription> getLatestSuccessfulSubscription(String clerkId) {
        return ownerSubscriptionRepository.findFirstByClerkIdAndStatusIgnoreCaseOrderByValidUntilDesc(clerkId, "ACTIVE");
    }

    /** Paid window only: {@code now <= validUntil} (no grace). */
    public boolean isWithinPaidPeriod(String clerkId) {
        return getLatestSuccessfulSubscription(clerkId)
                .map(OwnerSubscription::getValidUntil)
                .filter(u -> !LocalDateTime.now().isAfter(u))
                .isPresent();
    }

    /** Paid period + grace: owner dashboard and APIs allowed until {@code validUntil + graceDays}. */
    public boolean hasOwnerPortalAccess(String clerkId) {
        Optional<LocalDateTime> accessEnd = getAccessEndDateTime(clerkId);
        if (accessEnd.isEmpty()) {
            return false;
        }
        return !LocalDateTime.now().isAfter(accessEnd.get());
    }

    private Optional<LocalDateTime> getAccessEndDateTime(String clerkId) {
        return getLatestSuccessfulSubscription(clerkId)
                .map(OwnerSubscription::getValidUntil)
                .filter(v -> v != null)
                .map(v -> v.plusDays(graceDaysAfterValidUntil));
    }

    public boolean isInGracePeriod(String clerkId) {
        return getLatestSuccessfulSubscription(clerkId)
                .map(OwnerSubscription::getValidUntil)
                .filter(v -> v != null)
                .map(v -> {
                    LocalDateTime now = LocalDateTime.now();
                    return now.isAfter(v) && !now.isAfter(v.plusDays(graceDaysAfterValidUntil));
                })
                .orElse(false);
    }

    public Map<String, Object> buildPublicStatus(String clerkId) {
        Map<String, Object> m = new HashMap<>();
        Optional<OwnerSubscription> latest = getLatestSuccessfulSubscription(clerkId);
        LocalDateTime validUntil = latest.map(OwnerSubscription::getValidUntil).orElse(null);
        LocalDateTime graceEndsAt = validUntil != null ? validUntil.plusDays(graceDaysAfterValidUntil) : null;

        boolean portal = hasOwnerPortalAccess(clerkId);
        boolean inGrace = isInGracePeriod(clerkId);
        String phase;
        if (latest.isEmpty() || validUntil == null) {
            phase = "NONE";
        } else if (!portal) {
            phase = "LAPSED";
        } else if (inGrace) {
            phase = "GRACE";
        } else {
            phase = "ACTIVE";
        }

        m.put("phase", phase);
        m.put("validUntil", validUntil);
        m.put("graceEndsAt", graceEndsAt);
        m.put("graceDaysAfterValidUntil", graceDaysAfterValidUntil);
        m.put("subscriptionDurationDays", subscriptionDurationDays);
        m.put("hasActiveSubscription", isWithinPaidPeriod(clerkId));
        m.put("hasOwnerPortalAccess", portal);
        m.put("inGracePeriod", inGrace);
        m.put("latestStatus", latest.map(OwnerSubscription::getStatus).orElse("NONE"));
        return m;
    }

    @Transactional
    public void restoreOwnerAccessAfterPayment(String clerkId) {
        if (!hasOwnerPortalAccess(clerkId)) {
            return;
        }
        User user = userRepository.findByClerkId(clerkId).orElse(null);
        if (user == null) {
            return;
        }
        Optional<Plantation> plantationOpt = plantationRepository.findByOwner(user);
        if (plantationOpt.isEmpty()) {
            return;
        }
        Plantation plantation = plantationOpt.get();
        if (!user.getRoles().contains(Role.OWNER)) {
            user.getRoles().add(Role.OWNER);
        }
        user.setPlantation(plantation);
        userRepository.save(user);
        clerkService.updateUserMetadata(clerkId, Role.OWNER.name(), plantation.getId());
        log.info("Restored owner access after payment for clerkId={} plantationId={}", clerkId, plantation.getId());
    }

    @Transactional
    public void suspendOwnerAccessForLapsedSubscription(User user) {
        if (!user.getRoles().contains(Role.OWNER)) {
            return;
        }
        user.getRoles().remove(Role.OWNER);
        if (!user.getRoles().contains(Role.WORKER)) {
            user.getRoles().add(Role.WORKER);
        }
        user.setPlantation(null);
        userRepository.save(user);
        clerkService.updateUserMetadata(user.getClerkId(), Role.WORKER.name(), null);
        log.info("Suspended owner access (subscription lapsed past grace). clerkId={} plantation data kept in DB.", user.getClerkId());
    }

    /**
     * Removes owner portal access only for users who already have an estate row ({@link Plantation})
     * and whose subscription is past {@code validUntil + grace}. Skips OWNER accounts with no plantation
     * (e.g. first bootstrap admin still setting up) so they are not suspended solely for missing PayHere.
     */
    @Scheduled(cron = "${OWNER_SUBSCRIPTION_LAPSE_CRON:0 0 * * * *}")
    @Transactional
    public void scheduledSuspendOwnersPastGrace() {
        List<User> owners = userRepository.findAllHavingRole(Role.OWNER);
        int n = 0;
        for (User u : owners) {
            if (!plantationRepository.findByOwner(u).isPresent()) {
                continue;
            }
            if (!hasOwnerPortalAccess(u.getClerkId())) {
                suspendOwnerAccessForLapsedSubscription(u);
                n++;
            }
        }
        if (n > 0) {
            log.info("Subscription lapse job: suspended {} owner(s) past grace period.", n);
        }
    }

    @Scheduled(cron = "${OWNER_SUBSCRIPTION_REMINDER_CRON:0 0 9 * * *}")
    @Transactional
    public void scheduledSendRenewalReminders() {
        List<User> owners = userRepository.findAllHavingRole(Role.OWNER);
        LocalDateTime now = LocalDateTime.now();
        int sent = 0;

        for (User owner : owners) {
            Optional<OwnerSubscription> latestOpt = getLatestSuccessfulSubscription(owner.getClerkId());
            if (latestOpt.isEmpty()) {
                continue;
            }
            OwnerSubscription latest = latestOpt.get();
            if (latest.getValidUntil() == null) {
                continue;
            }

            long daysLeft = java.time.Duration.between(now, latest.getValidUntil()).toDays();
            if (daysLeft < 0) {
                continue;
            }

            if (daysLeft <= 1 && latest.getReminderOneDaySentAt() == null) {
                emailService.sendSubscriptionRenewalReminderEmail(latest.getId(), 1);
                latest.setReminderOneDaySentAt(now);
                ownerSubscriptionRepository.save(latest);
                sent++;
                continue;
            }

            if (daysLeft <= 7 && latest.getReminderSevenDaysSentAt() == null) {
                emailService.sendSubscriptionRenewalReminderEmail(latest.getId(), 7);
                latest.setReminderSevenDaysSentAt(now);
                ownerSubscriptionRepository.save(latest);
                sent++;
            }
        }

        if (sent > 0) {
            log.info("Subscription reminder job: sent {} renewal reminder email(s).", sent);
        }
    }
}
