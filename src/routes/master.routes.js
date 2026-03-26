const express = require("express");
const masterController = require("../controllers/masterController");
const auth = require("../middleware/auth");
const authorize = require("../middleware/authorize");
const commands = require("../config/commands");
const { asyncHandler } = require("../utils/controllerHelpers");
const HttpError = require("../utils/httpError");

const router = express.Router();

const commandMap = {
  [commands.HEALTH]: {
    handler: masterController.health
  },
  [commands.REGISTER]: {
    handler: masterController.register
  },
  [commands.LOGIN]: {
    handler: masterController.login
  },
  [commands.GET_PROFILE]: {
    authRequired: true,
    permission: commands.GET_PROFILE,
    handler: masterController.getProfile
  },
  [commands.LIST_USERS]: {
    authRequired: true,
    permission: commands.LIST_USERS,
    handler: masterController.listUsers
  },
  [commands.UPDATE_USER_STATUS]: {
    authRequired: true,
    permission: commands.UPDATE_USER_STATUS,
    idSource: "id",
    handler: masterController.updateUserStatus
  },
  [commands.CREATE_STORE_CATEGORY]: {
    authRequired: true,
    permission: commands.CREATE_STORE_CATEGORY,
    handler: masterController.createStoreCategory
  },
  [commands.LIST_STORE_CATEGORIES]: {
    handler: masterController.listStoreCategories
  },
  [commands.CREATE_DEAL_CATEGORY]: {
    authRequired: true,
    permission: commands.CREATE_DEAL_CATEGORY,
    handler: masterController.createDealCategory
  },
  [commands.LIST_DEAL_CATEGORIES]: {
    handler: masterController.listDealCategories
  },
  [commands.CREATE_STORE]: {
    authRequired: true,
    permission: commands.CREATE_STORE,
    handler: masterController.createStore
  },
  [commands.LIST_STORES]: {
    handler: masterController.listStores
  },
  [commands.LIST_USER_STORES]: {
    handler: masterController.listUserStores
  },
  [commands.GET_STORE]: {
    idSource: "id",
    handler: masterController.getStore
  },
  [commands.LIST_STORE_DEALS]: {
    handler: masterController.listStoreDeals
  },
  [commands.CREATE_DEAL]: {
    authRequired: true,
    permission: commands.CREATE_DEAL,
    handler: masterController.createDeal
  },
  [commands.LIST_DEALS]: {
    handler: masterController.listDeals
  },
  [commands.GET_DEAL]: {
    idSource: "id",
    handler: masterController.getDeal
  },
  [commands.ADD_DEAL_IMAGE]: {
    authRequired: true,
    permission: commands.ADD_DEAL_IMAGE,
    idSource: "id",
    handler: masterController.addDealImage
  },
  [commands.CREATE_AD]: {
    authRequired: true,
    permission: commands.CREATE_AD,
    handler: masterController.createAd
  },
  [commands.LIST_ADS]: {
    handler: masterController.listAds
  },
  [commands.CREATE_SUBSCRIPTION_PLAN]: {
    authRequired: true,
    permission: commands.CREATE_SUBSCRIPTION_PLAN,
    handler: masterController.createSubscriptionPlan
  },
  [commands.LIST_SUBSCRIPTION_PLANS]: {
    handler: masterController.listSubscriptionPlans
  },
  [commands.CREATE_NOTIFICATION]: {
    authRequired: true,
    permission: commands.CREATE_NOTIFICATION,
    handler: masterController.createNotification
  },
  [commands.MY_NOTIFICATIONS]: {
    authRequired: true,
    permission: commands.MY_NOTIFICATIONS,
    handler: masterController.myNotifications
  },
  [commands.MARK_NOTIFICATION_AS_READ]: {
    authRequired: true,
    permission: commands.MARK_NOTIFICATION_AS_READ,
    idSource: "id",
    handler: masterController.markNotificationAsRead
  }
};

const runMiddleware = (middleware, req, res) =>
  new Promise((resolve, reject) => {
    middleware(req, res, (error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });

const getCommandFromHeaders = (req) => {
  return req.headers.request || req.headers["x-command"] || req.headers.command;
};

const prepareRequest = (req, definition) => {
  const payload = req.body && typeof req.body === "object" ? req.body : {};
  req.query = { ...req.query, ...payload };
  req.params = req.params || {};

  if (definition.idSource) {
    const resourceId =
      payload[definition.idSource] ||
      req.query[definition.idSource] ||
      req.headers["x-resource-id"];

    if (!resourceId) {
      throw new HttpError(400, `Missing required field: ${definition.idSource}`);
    }

    req.params.id = resourceId;
  }
};

router.all(
  "/",
  asyncHandler(async (req, res) => {
    const command = getCommandFromHeaders(req);
    if (!command) {
      throw new HttpError(400, "Missing request header. Use request");
    }

    const definition = commandMap[command];
    if (!definition) {
      throw new HttpError(404, `Unsupported command: ${command}`);
    }

    prepareRequest(req, definition);

    if (definition.authRequired) {
      await runMiddleware(auth, req, res);
      await runMiddleware(authorize(definition.permission), req, res);
    }

    await definition.handler(req, res);
  })
);

module.exports = router;
