package online.jayashan.teaplanter.service;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.http.client.JdkClientHttpRequestFactory;

import java.util.HashMap;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class ClerkService {

    @Value("${clerk.secret-key}")
    private String clerkSecretKey;

    private final RestTemplate restTemplate = new RestTemplate(new JdkClientHttpRequestFactory());

    public void updateUserMetadata(String clerkUserId, String role, Long plantationId) {
        String url = "https://api.clerk.com/v1/users/" + clerkUserId + "/metadata";

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(clerkSecretKey);

        Map<String, Object> publicMetadata = new HashMap<>();
        if (role != null) {
            publicMetadata.put("role", role.toLowerCase());
        }
        if (plantationId != null) {
            publicMetadata.put("plantationId", plantationId);
        }

        Map<String, Object> body = new HashMap<>();
        body.put("public_metadata", publicMetadata);

        HttpEntity<Map<String, Object>> request = new HttpEntity<>(body, headers);

        try {
            restTemplate.exchange(url, HttpMethod.PATCH, request, Void.class);
        } catch (Exception e) {
            // Log the error but don't fail the sync process
            System.err.println("Failed to update Clerk metadata: " + e.getMessage());
        }
    }

    public java.util.List<Map<String, Object>> getClerkUsers() {
        String url = "https://api.clerk.com/v1/users?limit=50"; // Reduced limit for testing

        if (clerkSecretKey == null || clerkSecretKey.trim().isEmpty()) {
            System.err.println("DEBUG ERROR: Clerk Secret Key is MISSING in application.properties!");
            return java.util.Collections.emptyList();
        }
        System.out.println("DEBUG: Clerk Secret Key length: " + clerkSecretKey.length());

        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(clerkSecretKey.trim());

        System.out.println("DEBUG: Fetching users from Clerk API: " + url);
        HttpEntity<Void> request = new HttpEntity<>(headers);

        try {
            org.springframework.core.ParameterizedTypeReference<java.util.List<Map<String, Object>>> typeRef = new org.springframework.core.ParameterizedTypeReference<>() {
            };

            ResponseEntity<java.util.List<Map<String, Object>>> response = restTemplate.exchange(
                    url, HttpMethod.GET, request, typeRef);

            System.out.println("DEBUG: Clerk API Response Status: " + response.getStatusCode());
            return response.getBody();
        } catch (Exception e) {
            System.err.println("DEBUG ERROR: Failed to fetch Clerk users: " + e.getMessage());
            if (e instanceof org.springframework.web.client.HttpClientErrorException) {
                org.springframework.web.client.HttpClientErrorException he = (org.springframework.web.client.HttpClientErrorException) e;
                System.err.println("DEBUG ERROR Body: " + he.getResponseBodyAsString());
            }
            e.printStackTrace(); // Log full stack trace
            return java.util.Collections.emptyList();
        }
    }
}
