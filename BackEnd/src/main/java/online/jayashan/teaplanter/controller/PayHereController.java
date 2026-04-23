package online.jayashan.teaplanter.controller;

import lombok.RequiredArgsConstructor;
import online.jayashan.teaplanter.service.PayHereSubscriptionService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/payhere")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class PayHereController {

    private final PayHereSubscriptionService payHereSubscriptionService;

    @PostMapping("/subscription/session")
    public Map<String, String> createOwnerSubscriptionSession(@RequestParam String clerkId) {
        return payHereSubscriptionService.createSubscriptionCheckout(clerkId);
    }

    @GetMapping("/subscription/status")
    public Map<String, Object> getOwnerSubscriptionStatus(@RequestParam String clerkId) {
        return payHereSubscriptionService.getSubscriptionStatus(clerkId);
    }

    @GetMapping("/subscription/details")
    public Map<String, Object> getOwnerSubscriptionDetails(@RequestParam String clerkId) {
        return payHereSubscriptionService.getSubscriptionDetails(clerkId);
    }

    /**
     * Local/dev only when {@code PAYHERE_MANUAL_SETTLE_ENABLED=true}: marks the pending order paid so the UI can continue
     * when the PayHere server cannot POST to localhost {@code notify_url}.
     */
    @PostMapping("/subscription/manual-settle-local")
    public ResponseEntity<Void> manualSettleLocal(@RequestParam String clerkId, @RequestParam(required = false) String orderId) {
        payHereSubscriptionService.manualSettleLocalOrder(clerkId, orderId);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/webhook")
    public ResponseEntity<String> handleWebhook(@RequestParam Map<String, String> payload) {
        payHereSubscriptionService.processWebhook(payload);
        return ResponseEntity.ok("OK");
    }
}
