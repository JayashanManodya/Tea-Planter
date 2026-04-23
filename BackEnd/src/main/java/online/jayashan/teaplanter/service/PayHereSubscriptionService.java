package online.jayashan.teaplanter.service;

import lombok.RequiredArgsConstructor;
import online.jayashan.teaplanter.entity.OwnerSubscription;
import online.jayashan.teaplanter.entity.User;
import online.jayashan.teaplanter.repository.OwnerSubscriptionRepository;
import online.jayashan.teaplanter.repository.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class PayHereSubscriptionService {

    private static final DateTimeFormatter AMOUNT_FORMATTER = DateTimeFormatter.ofPattern("yyyyMMddHHmmss");

    private final OwnerSubscriptionRepository ownerSubscriptionRepository;
    private final UserRepository userRepository;
    private final OwnerSubscriptionLifecycleService ownerSubscriptionLifecycleService;
    private final EmailService emailService;

    @Value("${PAYHERE_MERCHANT_ID:}")
    private String payHereMerchantId;

    @Value("${PAYHERE_MERCHANT_SECRET:}")
    private String payHereMerchantSecret;

    @Value("${PAYHERE_SUBSCRIPTION_AMOUNT:990.00}")
    private Double subscriptionAmount;

    @Value("${PAYHERE_SUBSCRIPTION_CURRENCY:LKR}")
    private String subscriptionCurrency;

    @Value("${PAYHERE_SUBSCRIPTION_NAME:Tea Planter Owner Subscription}")
    private String subscriptionPlanName;

    @Value("${PAYHERE_SUBSCRIPTION_DURATION_DAYS:30}")
    private Integer subscriptionDurationDays;

    @Value("${PAYHERE_RETURN_URL:http://localhost:5174/settings}")
    private String returnUrl;

    @Value("${PAYHERE_CANCEL_URL:http://localhost:5174/settings}")
    private String cancelUrl;

    @Value("${PAYHERE_NOTIFY_URL:http://localhost:8080/api/payhere/webhook}")
    private String notifyUrl;

    @Value("${PAYHERE_DEFAULT_COUNTRY:Sri Lanka}")
    private String defaultCountry;

    @Value("${PAYHERE_DEFAULT_CITY:Colombo}")
    private String defaultCity;

    @Value("${PAYHERE_DEFAULT_ADDRESS:Tea Planter}")
    private String defaultAddress;

    @Value("${PAYHERE_DEFAULT_PHONE:0770000000}")
    private String defaultPhone;

    @Value("${PAYHERE_MANUAL_SETTLE_ENABLED:false}")
    private boolean manualSettleEnabled;

    @Transactional
    public Map<String, String> createSubscriptionCheckout(String clerkId) {
        validatePayHereConfiguration();

        User user = userRepository.findByClerkId(clerkId)
                .orElseThrow(() -> new RuntimeException("User not found: " + clerkId));

        String orderId = "OWNER-SUB-" + AMOUNT_FORMATTER.format(LocalDateTime.now()) + "-" + Math.abs(clerkId.hashCode());
        String amount = String.format(Locale.US, "%.2f", subscriptionAmount);
        String currency = subscriptionCurrency.toUpperCase(Locale.ROOT);
        String hashedSecret = md5(payHereMerchantSecret).toUpperCase(Locale.ROOT);
        String hash = md5(payHereMerchantId + orderId + amount + currency + hashedSecret).toUpperCase(Locale.ROOT);

        OwnerSubscription pending = OwnerSubscription.builder()
                .clerkId(clerkId)
                .orderId(orderId)
                .status("PENDING")
                .amount(subscriptionAmount)
                .currency(currency)
                .planName(subscriptionPlanName)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();
        ownerSubscriptionRepository.save(pending);

        String[] names = splitName(user.getName());

        Map<String, String> session = new HashMap<>();
        session.put("sandbox_url", "https://sandbox.payhere.lk/pay/checkout");
        session.put("merchant_id", payHereMerchantId);
        session.put("return_url", returnUrl);
        session.put("cancel_url", cancelUrl);
        session.put("notify_url", notifyUrl);
        session.put("order_id", orderId);
        session.put("items", subscriptionPlanName);
        session.put("currency", currency);
        session.put("amount", amount);
        session.put("first_name", names[0]);
        session.put("last_name", names[1]);
        session.put("email", user.getEmail());
        session.put("phone", firstNonBlank(user.getPhone(), defaultPhone));
        session.put("address", defaultAddress);
        session.put("city", defaultCity);
        session.put("country", defaultCountry);
        session.put("custom_1", clerkId);
        session.put("recurrence", "1 Month");
        session.put("duration", "Forever");
        session.put("hash", hash);
        return session;
    }

    @Transactional
    public void processWebhook(Map<String, String> payload) {
        validatePayHereConfiguration();

        String merchantId = payload.getOrDefault("merchant_id", "");
        String orderId = payload.getOrDefault("order_id", "");
        String payHereAmount = payload.getOrDefault("payhere_amount", "");
        String payHereCurrency = payload.getOrDefault("payhere_currency", "");
        String statusCode = payload.getOrDefault("status_code", "");
        String receivedMd5Sig = payload.getOrDefault("md5sig", "");
        String paymentId = payload.getOrDefault("payment_id", "");
        String clerkId = payload.getOrDefault("custom_1", "");

        String localMd5Sig = md5(
                merchantId + orderId + payHereAmount + payHereCurrency + statusCode + md5(payHereMerchantSecret).toUpperCase(Locale.ROOT)
        ).toUpperCase(Locale.ROOT);

        if (!localMd5Sig.equals(receivedMd5Sig.toUpperCase(Locale.ROOT))) {
            throw new RuntimeException("Invalid PayHere signature");
        }

        OwnerSubscription subscription = ownerSubscriptionRepository.findByOrderId(orderId)
                .orElseGet(() -> OwnerSubscription.builder()
                        .orderId(orderId)
                        .clerkId(clerkId)
                        .amount(parseAmount(payHereAmount))
                        .currency(payHereCurrency)
                        .planName(subscriptionPlanName)
                        .createdAt(LocalDateTime.now())
                        .updatedAt(LocalDateTime.now())
                        .status("PENDING")
                        .build());

        subscription.setPaymentId(paymentId);
        subscription.setUpdatedAt(LocalDateTime.now());

        if ("2".equals(statusCode)) {
            subscription.setStatus("ACTIVE");
            subscription.setPaidAt(LocalDateTime.now());
            subscription.setValidUntil(LocalDateTime.now().plusDays(subscriptionDurationDays));
        } else {
            subscription.setStatus("FAILED");
        }

        ownerSubscriptionRepository.save(subscription);
        ownerSubscriptionRepository.flush();

        if ("2".equals(statusCode)) {
            String effectiveClerkId = subscription.getClerkId() != null && !subscription.getClerkId().isBlank()
                    ? subscription.getClerkId()
                    : clerkId;
            ownerSubscriptionLifecycleService.restoreOwnerAccessAfterPayment(effectiveClerkId);
            if (subscription.getInvoiceSentAt() == null) {
                emailService.sendSubscriptionInvoiceEmail(subscription.getId());
                subscription.setInvoiceSentAt(LocalDateTime.now());
                ownerSubscriptionRepository.save(subscription);
            }
        }
    }

    public Map<String, Object> getSubscriptionStatus(String clerkId) {
        return new HashMap<>(ownerSubscriptionLifecycleService.buildPublicStatus(clerkId));
    }

    public Map<String, Object> getSubscriptionDetails(String clerkId) {
        Map<String, Object> status = new HashMap<>(ownerSubscriptionLifecycleService.buildPublicStatus(clerkId));
        List<OwnerSubscription> recent = ownerSubscriptionRepository.findTop10ByClerkIdOrderByCreatedAtDesc(clerkId);

        Map<String, Object> latest = null;
        if (!recent.isEmpty()) {
            latest = toPublicSubscription(recent.get(0));
        }

        List<Map<String, Object>> history = new ArrayList<>();
        for (OwnerSubscription sub : recent) {
            history.add(toPublicSubscription(sub));
        }

        long successfulPayments = recent.stream()
                .filter(s -> "ACTIVE".equalsIgnoreCase(s.getStatus()))
                .count();

        status.put("nextSubscriptionDate", status.get("validUntil"));
        status.put("latest", latest);
        status.put("history", history);
        status.put("totalSuccessfulPayments", successfulPayments);
        status.put("historyCount", history.size());
        return status;
    }

    /** Within paid billing window ({@code now <= validUntil}), excluding grace-only access. */
    public boolean hasActiveSubscription(String clerkId) {
        return ownerSubscriptionLifecycleService.isWithinPaidPeriod(clerkId);
    }

    /** Paid period plus grace — required to create a plantation and use owner portal. */
    public boolean hasOwnerPortalAccess(String clerkId) {
        return ownerSubscriptionLifecycleService.hasOwnerPortalAccess(clerkId);
    }

    /**
     * When PayHere {@code notify_url} cannot reach your machine (e.g. localhost), use this only if
     * {@code PAYHERE_MANUAL_SETTLE_ENABLED=true} after a real sandbox payment you completed in the browser.
     * Never enable on public production unless you understand the risk.
     */
    @Transactional
    public void manualSettleLocalOrder(String clerkId, String orderId) {
        if (!manualSettleEnabled) {
            throw new RuntimeException("Manual subscription settle is disabled. Set PAYHERE_MANUAL_SETTLE_ENABLED=true for local dev, or use a public notify_url (e.g. ngrok).");
        }
        OwnerSubscription sub;
        if (orderId != null && !orderId.isBlank()) {
            sub = ownerSubscriptionRepository.findByOrderId(orderId)
                    .orElseThrow(() -> new RuntimeException("Subscription order not found: " + orderId));
        } else {
            sub = ownerSubscriptionRepository.findFirstByClerkIdAndStatusIgnoreCaseOrderByCreatedAtDesc(clerkId, "PENDING")
                    .orElseThrow(() -> new RuntimeException("No pending subscription for this account. Start checkout again."));
        }
        if (!clerkId.equals(sub.getClerkId())) {
            throw new RuntimeException("This payment does not belong to the signed-in user.");
        }
        sub.setStatus("ACTIVE");
        sub.setPaidAt(LocalDateTime.now());
        sub.setValidUntil(LocalDateTime.now().plusDays(subscriptionDurationDays));
        sub.setUpdatedAt(LocalDateTime.now());
        boolean shouldSendInvoice = sub.getInvoiceSentAt() == null;
        if (shouldSendInvoice) {
            sub.setInvoiceSentAt(LocalDateTime.now());
        }
        ownerSubscriptionRepository.save(sub);
        ownerSubscriptionRepository.flush();
        ownerSubscriptionLifecycleService.restoreOwnerAccessAfterPayment(clerkId);
        if (shouldSendInvoice) {
            emailService.sendSubscriptionInvoiceEmail(sub.getId());
        }
    }

    private void validatePayHereConfiguration() {
        if (payHereMerchantId == null || payHereMerchantId.isBlank() || payHereMerchantSecret == null || payHereMerchantSecret.isBlank()) {
            throw new RuntimeException("PayHere is not configured. Set PAYHERE_MERCHANT_ID and PAYHERE_MERCHANT_SECRET.");
        }
    }

    private double parseAmount(String amount) {
        try {
            return Double.parseDouble(amount);
        } catch (Exception ex) {
            return subscriptionAmount;
        }
    }

    private String[] splitName(String fullName) {
        if (fullName == null || fullName.isBlank()) {
            return new String[]{"Tea", "Owner"};
        }
        String[] parts = fullName.trim().split("\\s+", 2);
        if (parts.length == 1) {
            return new String[]{parts[0], "Owner"};
        }
        return parts;
    }

    private String md5(String input) {
        try {
            MessageDigest md = MessageDigest.getInstance("MD5");
            byte[] digest = md.digest(input.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder();
            for (byte b : digest) {
                sb.append(String.format("%02x", b));
            }
            return sb.toString();
        } catch (Exception ex) {
            throw new RuntimeException("Unable to hash PayHere payload", ex);
        }
    }

    private String firstNonBlank(String value, String fallback) {
        if (value == null || value.isBlank()) {
            return fallback;
        }
        return value;
    }

    private Map<String, Object> toPublicSubscription(OwnerSubscription sub) {
        Map<String, Object> m = new HashMap<>();
        m.put("id", sub.getId());
        m.put("orderId", sub.getOrderId());
        m.put("paymentId", sub.getPaymentId());
        m.put("status", sub.getStatus());
        m.put("amount", sub.getAmount());
        m.put("currency", sub.getCurrency());
        m.put("planName", sub.getPlanName());
        m.put("paidAt", sub.getPaidAt());
        m.put("validUntil", sub.getValidUntil());
        m.put("createdAt", sub.getCreatedAt());
        m.put("updatedAt", sub.getUpdatedAt());
        return m;
    }
}
