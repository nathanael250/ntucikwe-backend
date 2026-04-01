const normalizePhoneNumber = (phoneNumber) => {
  if (!phoneNumber) {
    return null;
  }

  const normalized = String(phoneNumber).trim().replace(/\s+/g, "");

  if (normalized.endsWith("@c.us")) {
    return normalized;
  }

  return `${normalized.replace(/^\+/, "")}@c.us`;
};

const isConfigured = () =>
  Boolean(
    process.env.WHATSAPP_PROVIDER === "wawp" &&
      process.env.WAWP_INSTANCE_ID &&
      process.env.WAWP_ACCESS_TOKEN
  );

const buildPickupMessage = ({ order, redemption, qrImage }) => {
  const itemText = (redemption.items || [])
    .map((item) => `${item.deal_title} x${item.quantity}`)
    .join(", ");

  const lines = [
    "Your order is ready for pickup.",
    `Order: ${order.order_code}`,
    `Store: ${redemption.store_name}`,
    `Items: ${itemText || "Selected deals"}`,
    `Expires: ${redemption.expires_at}`
  ];

  if (qrImage && qrImage.public_url) {
    lines.push(`QR Code: ${qrImage.public_url}`);
  } else {
    lines.push(`QR Token: ${redemption.qr_value}`);
  }

  lines.push("Show this QR code to the vendor during collection.");

  return lines.join("\n");
};

const sendWhatsAppMessage = async ({ to, body, mediaUrl }) => {
  if (!to) {
    return {
      success: false,
      provider: process.env.WHATSAPP_PROVIDER || "none",
      message: "Recipient phone number is missing"
    };
  }

  if (!isConfigured()) {
    return {
      success: false,
      provider: process.env.WHATSAPP_PROVIDER || "none",
      message: "WhatsApp service is not configured"
    };
  }

  if (!mediaUrl) {
    return {
      success: false,
      provider: "wawp",
      message: "A public QR image URL is required to send the WhatsApp checkout message"
    };
  }

  const baseUrl = (process.env.WAWP_API_BASE_URL || "https://api.wawp.net").replace(/\/$/, "");
  const params = new URLSearchParams({
    instance_id: process.env.WAWP_INSTANCE_ID,
    access_token: process.env.WAWP_ACCESS_TOKEN
  });
  const endpoint = `${baseUrl}/v2/send/image?${params.toString()}`;
  const payload = {
    chatId: normalizePhoneNumber(to),
    "file[url]": mediaUrl,
    "file[filename]": mediaUrl.split("/").pop() || "pickup-qr.png",
    "file[mimetype]": "image/png",
    caption: body,
    reply_to: false
  };

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const message = data.message || data.error || "Wawp API request failed";
      throw new Error(message);
    }

    return {
      success: true,
      provider: "wawp",
      message_id: data.id || data.messageId || null,
      status: data.status || "accepted",
      to: payload.chatId,
      mode: "image",
      raw: data
    };
  } catch (error) {
    return {
      success: false,
      provider: "wawp",
      message: error.message,
      to: payload.chatId
    };
  }
};

const sendOrderQrCodes = async ({ order }) => {
  const recipientPhone =
    order.customer_phone_number ||
    order.phone_number ||
    process.env.WHATSAPP_DEFAULT_TO ||
    "+250781796824";

  const { ensureQrCodeImage } = require("./qrCodeService");
  const results = [];

  for (const redemption of order.store_redemptions || []) {
    const qrImage = await ensureQrCodeImage({
      qr_token: redemption.qr_token,
      qr_value: redemption.qr_value
    });

    const body = buildPickupMessage({
      order,
      redemption,
      qrImage
    });

    const delivery = await sendWhatsAppMessage({
      to: recipientPhone,
      body,
      mediaUrl: qrImage.public_url || null
    });

    results.push({
      store_id: redemption.store_id,
      store_name: redemption.store_name,
      recipient_phone: recipientPhone,
      qr_image_url: qrImage.public_url,
      qr_image_path: qrImage.relative_path,
      ...delivery
    });
  }

  return results;
};

module.exports = {
  sendWhatsAppMessage,
  sendOrderQrCodes,
  buildPickupMessage
};
