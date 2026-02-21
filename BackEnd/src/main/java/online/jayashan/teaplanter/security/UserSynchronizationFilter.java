package online.jayashan.teaplanter.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import online.jayashan.teaplanter.service.UserService;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
@RequiredArgsConstructor
public class UserSynchronizationFilter extends OncePerRequestFilter {

    private final UserService userService;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        if (authentication != null && authentication.getPrincipal() instanceof Jwt) {
            Jwt jwt = (Jwt) authentication.getPrincipal();

            String clerkId = jwt.getSubject();
            String email = jwt.getClaimAsString("email");

            // Try to extract name from various claims
            String name = jwt.getClaimAsString("name");
            if (name == null || name.trim().isEmpty()) {
                String firstName = jwt.getClaimAsString("given_name");
                String lastName = jwt.getClaimAsString("family_name");
                if (firstName != null || lastName != null) {
                    name = (firstName != null ? firstName : "") + (lastName != null ? " " + lastName : "");
                }
            }
            if (name == null || name.trim().isEmpty()) {
                name = jwt.getClaimAsString("preferred_username");
            }
            if (name == null || name.trim().isEmpty()) {
                name = "User " + (clerkId.length() > 4 ? clerkId.substring(clerkId.length() - 4) : clerkId);
            }

            // Sync user details with database and Clerk metadata
            userService.syncUser(clerkId, name, email);
        }

        filterChain.doFilter(request, response);
    }
}
