const commands = require("../config/commands");
const Ad = require("../models/Ad");
const Deal = require("../models/Deal");
const DealCategory = require("../models/DealCategory");
const Notification = require("../models/Notification");
const RedemptionRequest = require("../models/RedemptionRequest");
const Store = require("../models/Store");
const StoreCategory = require("../models/StoreCategory");
const SubscriptionPlan = require("../models/SubscriptionPlan");
const User = require("../models/User");
const HttpError = require("../utils/httpError");
const { requireFields, parsePagination } = require("../utils/controllerHelpers");
const { signToken } = require("../utils/tokenUtils");
const { sendOrderQrCodes } = require("../utils/whatsappService");

const sanitizeRegistrationRole = (role) => {
  if (!role) {
    return "public_user";
  }

  if (!["vendor", "public_user"].includes(role)) {
    throw new HttpError(400, "Registration role must be vendor or public_user");
  }

  return role;
};

const buildAuthResponse = (user) => ({
  user,
  token: signToken({ userId: user.id, role: user.role })
});

const parseJsonArrayField = (value) => {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value !== "string") {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch (_error) {
    return [value];
  }
};

const getUploadedFiles = (req) => {
  if (Array.isArray(req.files)) {
    return req.files;
  }

  if (req.files && typeof req.files === "object") {
    return Object.values(req.files).flat();
  }

  if (req.file) {
    return [req.file];
  }

  return [];
};

const getUploadedFileByField = (req, fieldNames) => {
  if (!req.files || typeof req.files !== "object" || Array.isArray(req.files)) {
    return null;
  }

  for (const fieldName of fieldNames) {
    const files = req.files[fieldName];
    if (Array.isArray(files) && files[0]) {
      return files[0];
    }
  }

  return null;
};

const masterController = {
  commands,

  health: async (_req, res) => {
    res.json({
      success: true,
      message: "Marketplace backend is running"
    });
  },

  register: async (req, res) => {
    requireFields(req.body, ["first_name", "last_name", "email", "password"]);
    const user = await User.create({
      ...req.body,
      role: sanitizeRegistrationRole(req.body.role)
    });

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      data: buildAuthResponse(user)
    });
  },

  login: async (req, res) => {
    requireFields(req.body, ["email", "password"]);
    const user = await User.authenticate(req.body.email, req.body.password);

    res.json({
      success: true,
      message: "Login successful",
      data: buildAuthResponse(user)
    });
  },

  getProfile: async (req, res) => {
    res.json({
      success: true,
      data: req.user
    });
  },

  listUsers: async (req, res) => {
    const pagination = parsePagination(req.query);
    const users = await User.list({
      ...pagination,
      role: req.query.role,
      status: req.query.status,
      search: req.query.search
    });

    res.json({
      success: true,
      data: users,
      meta: pagination
    });
  },

  updateUserStatus: async (req, res) => {
    requireFields(req.body, ["status"]);
    const user = await User.updateStatus(req.params.id, req.body.status);
    res.json({
      success: true,
      message: "User status updated",
      data: user
    });
  },

  createStoreCategory: async (req, res) => {
    requireFields(req.body, ["category_name"]);
    const category = await StoreCategory.create(req.body);
    res.status(201).json({ success: true, data: category });
  },

  listStoreCategories: async (_req, res) => {
    const categories = await StoreCategory.list();
    res.json({ success: true, data: categories });
  },

  createDealCategory: async (req, res) => {
    requireFields(req.body, ["category_name"]);
    const category = await DealCategory.create(req.body);
    res.status(201).json({ success: true, data: category });
  },

  listDealCategories: async (_req, res) => {
    const categories = await DealCategory.list();
    res.json({ success: true, data: categories });
  },

  createStore: async (req, res) => {
    requireFields(req.body, ["store_name"]);
    if (req.user.role === "admin") {
      requireFields(req.body, ["vendor_id"]);
    }

    const bannerFile = getUploadedFileByField(req, ["banner"]);
    const profileFile = getUploadedFileByField(req, ["profile_image", "profile"]);

    const store = await Store.create({
      ...req.body,
      banner: bannerFile ? `/uploads/stores/${bannerFile.filename}` : req.body.banner,
      profile_image: profileFile
        ? `/uploads/stores/${profileFile.filename}`
        : req.body.profile_image,
      vendor_id: req.user.role === "vendor" ? req.user.id : req.body.vendor_id
    });

    res.status(201).json({
      success: true,
      message: "Store created successfully",
      data: store
    });
  },

  updateStore: async (req, res) => {
    const existingStore = await Store.findById(req.params.id);
    if (!existingStore) {
      throw new HttpError(404, "Store not found");
    }

    if (req.user.role === "vendor") {
      await Store.assertVendorOwnership(req.params.id, req.user.id);
    }

    const bannerFile = getUploadedFileByField(req, ["banner"]);
    const profileFile = getUploadedFileByField(req, ["profile_image", "profile"]);

    const store = await Store.update(req.params.id, {
      ...req.body,
      banner: bannerFile ? `/uploads/stores/${bannerFile.filename}` : req.body.banner,
      profile_image: profileFile
        ? `/uploads/stores/${profileFile.filename}`
        : req.body.profile_image
    });

    res.json({
      success: true,
      message: "Store updated successfully",
      data: store
    });
  },

  listStores: async (req, res) => {
    const pagination = parsePagination(req.query);
    const stores = await Store.list({
      ...pagination,
      vendor_id: req.query.vendor_id,
      store_category_id: req.query.store_category_id,
      location: req.query.location,
      search: req.query.search
    });

    res.json({ success: true, data: stores, meta: pagination });
  },

  listUserStores: async (req, res) => {
    requireFields(req.query, ["user_id"]);

    const user = await User.getSafeUserById(req.query.user_id);
    if (!user) {
      throw new HttpError(404, "User not found");
    }

    const pagination = parsePagination(req.query);
    const stores = await Store.list({
      ...pagination,
      vendor_id: req.query.user_id,
      store_category_id: req.query.store_category_id,
      location: req.query.location,
      search: req.query.search
    });

    res.json({
      success: true,
      data: {
        user,
        stores
      },
      meta: pagination
    });
  },

  getStore: async (req, res) => {
    const store = await Store.findById(req.params.id);
    if (!store) {
      throw new HttpError(404, "Store not found");
    }

    res.json({ success: true, data: store });
  },

  listStoreDeals: async (req, res) => {
    requireFields(req.query, ["store_id"]);

    const store = await Store.findById(req.query.store_id);
    if (!store) {
      throw new HttpError(404, "Store not found");
    }

    const pagination = parsePagination(req.query);
    const deals = await Deal.list({
      ...pagination,
      store_id: req.query.store_id,
      deal_category_id: req.query.deal_category_id,
      status: req.query.status,
      location: req.query.location,
      min_discount_rate: req.query.min_discount_rate,
      search: req.query.search
    });

    res.json({
      success: true,
      data: {
        store,
        deals
      },
      meta: pagination
    });
  },

  createRedemptionQr: async (req, res) => {
    requireFields(req.body, ["items"]);

    if (!req.user) {
      requireFields(req.body, ["customer_name", "phone_number", "email"]);
    }

    const order = await RedemptionRequest.createFromSelection({
      user_id: req.user ? req.user.id : null,
      customer_name: req.user
        ? `${req.user.first_name} ${req.user.last_name}`.trim()
        : req.body.customer_name,
      phone_number: req.user ? req.user.phone_number : req.body.phone_number,
      email: req.user ? req.user.email : req.body.email,
      items: req.body.items,
      expires_in_minutes: req.body.expires_in_minutes
    });

    if (req.user) {
      await Notification.create({
        user_id: req.user.id,
        title: "Order QR Codes Created",
        description: order.summary_message
      });
    }

    const whatsapp_messages = await sendOrderQrCodes({ order });
    const whatsappByStoreId = new Map(
      whatsapp_messages.map((message) => [Number(message.store_id), message])
    );
    const orderWithQrDelivery = {
      ...order,
      store_redemptions: (order.store_redemptions || []).map((redemption) => {
        const delivery = whatsappByStoreId.get(Number(redemption.store_id));

        return {
          ...redemption,
          qr_image_url: delivery ? delivery.qr_image_url || null : null,
          qr_image_path: delivery ? delivery.qr_image_path || null : null,
          whatsapp_delivery: delivery || null
        };
      })
    };

    res.status(201).json({
      success: true,
      message: req.user
        ? "Order created successfully with store QR codes"
        : "Guest order created successfully with store QR codes",
      data: {
        ...orderWithQrDelivery,
        whatsapp_messages
      }
    });
  },

  getOrderDetails: async (req, res) => {
    const order = await RedemptionRequest.findOrderForActor({
      order_id: req.body.order_id,
      order_code: req.body.order_code,
      actor: req.user
    });

    if (!order) {
      throw new HttpError(404, "Order not found");
    }

    res.json({
      success: true,
      data: order
    });
  },

  listUsedRedemptionQrs: async (req, res) => {
    const pagination = parsePagination(req.query);
    const redemptions = await RedemptionRequest.listUsedForActor({
      actor: req.user,
      ...pagination,
      store_id: req.query.store_id,
      order_code: req.query.order_code,
      search: req.query.search
    });

    res.json({
      success: true,
      data: redemptions,
      meta: pagination
    });
  },

  verifyRedemptionQr: async (req, res) => {
    requireFields(req.body, ["qr_token"]);

    const redemptionRequest = await RedemptionRequest.findByToken(req.body.qr_token);
    if (!redemptionRequest) {
      throw new HttpError(404, "QR code not found");
    }

    if (req.user.role === "vendor") {
      await Store.assertVendorOwnership(redemptionRequest.store_id, req.user.id);
    }

    res.json({
      success: true,
      data: redemptionRequest
    });
  },

  useRedemptionQr: async (req, res) => {
    requireFields(req.body, ["qr_token"]);

    const existing = await RedemptionRequest.findByToken(req.body.qr_token);
    if (!existing) {
      throw new HttpError(404, "QR code not found");
    }

    if (req.user.role === "vendor") {
      await Store.assertVendorOwnership(existing.store_id, req.user.id);
    }

    const redemptionRequest = await RedemptionRequest.markAsUsed({
      qr_token: req.body.qr_token,
      used_by: req.user.id
    });

    if (redemptionRequest.user_id) {
      await Notification.create({
        user_id: redemptionRequest.user_id,
        title: "QR Code Used",
        description: `Your QR code for ${redemptionRequest.store_name} has been scanned and used.`
      });
    }

    res.json({
      success: true,
      message: "QR code marked as used",
      data: redemptionRequest
    });
  },

  createDeal: async (req, res) => {
    requireFields(req.body, [
      "title",
      "store_id",
      "original_price",
      "discount_price",
      "end_date"
    ]);

    if (req.user.role === "vendor") {
      await Store.assertVendorOwnership(req.body.store_id, req.user.id);
    }

    const uploadedImages = getUploadedFiles(req).map(
      (file) => `/uploads/deals/${file.filename}`
    );
    const existingImages = parseJsonArrayField(req.body.images);

    const deal = await Deal.create({
      ...req.body,
      images: [...existingImages, ...uploadedImages]
    });

    res.status(201).json({
      success: true,
      message: "Deal created successfully",
      data: deal
    });
  },

  listDeals: async (req, res) => {
    const pagination = parsePagination(req.query);
    const deals = await Deal.list({
      ...pagination,
      store_id: req.query.store_id,
      deal_category_id: req.query.deal_category_id,
      status: req.query.status,
      location: req.query.location,
      min_discount_rate: req.query.min_discount_rate,
      search: req.query.search
    });

    res.json({ success: true, data: deals, meta: pagination });
  },

  getDeal: async (req, res) => {
    const deal = await Deal.findById(req.params.id);
    if (!deal) {
      throw new HttpError(404, "Deal not found");
    }

    res.json({ success: true, data: deal });
  },

  addDealImage: async (req, res) => {
    if (req.user.role === "vendor") {
      const deal = await Deal.findById(req.params.id);
      if (!deal) {
        throw new HttpError(404, "Deal not found");
      }

      await Store.assertVendorOwnership(deal.store_id, req.user.id);
    }

    const [uploadedFile] = getUploadedFiles(req);
    const uploadedImagePath = uploadedFile ? `/uploads/deals/${uploadedFile.filename}` : null;
    const imagePath = uploadedImagePath || req.body.image_path;
    requireFields({ image_path: imagePath }, ["image_path"]);

    const image = await Deal.addImage({
      deal_id: req.params.id,
      image_path: imagePath
    });

    res.status(201).json({ success: true, data: image });
  },

  createAd: async (req, res) => {
    requireFields(req.body, ["title"]);
    if (req.user.role === "admin") {
      requireFields(req.body, ["owner_id"]);
    }

    const [uploadedBanner] = getUploadedFiles(req);
    const bannerPath = uploadedBanner ? `/uploads/ads/${uploadedBanner.filename}` : null;

    const ad = await Ad.create({
      ...req.body,
      banner: bannerPath || req.body.banner,
      owner_id: req.user.role === "admin" ? req.body.owner_id : req.user.id
    });

    res.status(201).json({
      success: true,
      message: "Advertisement created successfully",
      data: ad
    });
  },

  listAds: async (req, res) => {
    const pagination = parsePagination(req.query);
    const ads = await Ad.list({
      ...pagination,
      status: req.query.status,
      location: req.query.location,
      owner_id: req.query.owner_id
    });

    res.json({ success: true, data: ads, meta: pagination });
  },

  createSubscriptionPlan: async (req, res) => {
    requireFields(req.body, ["plan_name", "price", "duration_in_days"]);
    const plan = await SubscriptionPlan.create(req.body);
    res.status(201).json({ success: true, data: plan });
  },

  listSubscriptionPlans: async (req, res) => {
    const plans = await SubscriptionPlan.list({ status: req.query.status });
    res.json({ success: true, data: plans });
  },

  createNotification: async (req, res) => {
    requireFields(req.body, ["user_id", "title"]);
    const notification = await Notification.create(req.body);
    res.status(201).json({ success: true, data: notification });
  },

  myNotifications: async (req, res) => {
    const notifications = await Notification.listByUser(req.user.id);
    res.json({ success: true, data: notifications });
  },

  markNotificationAsRead: async (req, res) => {
    const notification = await Notification.markAsRead(req.params.id, req.user.id);
    if (!notification) {
      throw new HttpError(404, "Notification not found");
    }

    res.json({ success: true, data: notification });
  }
};

module.exports = masterController;
