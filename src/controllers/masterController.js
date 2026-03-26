const commands = require("../config/commands");
const Ad = require("../models/Ad");
const Deal = require("../models/Deal");
const DealCategory = require("../models/DealCategory");
const Notification = require("../models/Notification");
const Store = require("../models/Store");
const StoreCategory = require("../models/StoreCategory");
const SubscriptionPlan = require("../models/SubscriptionPlan");
const User = require("../models/User");
const HttpError = require("../utils/httpError");
const { requireFields, parsePagination } = require("../utils/controllerHelpers");
const { signToken } = require("../utils/tokenUtils");

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

    const store = await Store.create({
      ...req.body,
      vendor_id: req.user.role === "vendor" ? req.user.id : req.body.vendor_id
    });

    res.status(201).json({
      success: true,
      message: "Store created successfully",
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

  createDeal: async (req, res) => {
    requireFields(req.body, ["title", "store_id", "original_price", "discount_price"]);

    if (req.user.role === "vendor") {
      await Store.assertVendorOwnership(req.body.store_id, req.user.id);
    }

    const deal = await Deal.create(req.body);

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
    requireFields(req.body, ["image_path"]);

    if (req.user.role === "vendor") {
      const deal = await Deal.findById(req.params.id);
      if (!deal) {
        throw new HttpError(404, "Deal not found");
      }

      await Store.assertVendorOwnership(deal.store_id, req.user.id);
    }

    const image = await Deal.addImage({
      deal_id: req.params.id,
      image_path: req.body.image_path
    });

    res.status(201).json({ success: true, data: image });
  },

  createAd: async (req, res) => {
    requireFields(req.body, ["title"]);
    if (req.user.role === "admin") {
      requireFields(req.body, ["owner_id"]);
    }

    const ad = await Ad.create({
      ...req.body,
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
