const express = require("express");
const path = require("path");
const crypto = require("crypto");

const app = express();
const PORT = process.env.PORT || 3000;

// ===============================
// DASHBOARD SECURITY
// ===============================

const DASHBOARD_PASSWORD =
    process.env.DASHBOARD_PASSWORD || "CHANGE_ME";

const SESSION_SECRET =
    process.env.SESSION_SECRET || "CHANGE_THIS_SECRET";

const COOKIE_NAME = "eatguyz_dashboard_session";

// ===============================
// MIDDLEWARE
// ===============================

app.use(express.json());

// ===============================
// SESSION FUNCTIONS
// ===============================

function createSessionToken() {

    const timestamp = Date.now();

    const signature = crypto
        .createHmac("sha256", SESSION_SECRET)
        .update(String(timestamp))
        .digest("hex");

    return `${timestamp}.${signature}`;
}

function isValidSession(req) {

    const cookieHeader = req.headers.cookie || "";

    const cookies = {};

    cookieHeader.split(";").forEach(cookie => {

        const [key, ...valueParts] = cookie.trim().split("=");

        if (key) {
            cookies[key] =
                decodeURIComponent(valueParts.join("="));
        }

    });

    const token = cookies[COOKIE_NAME];

    if (!token) {
        return false;
    }

    const [timestamp, signature] = token.split(".");

    if (!timestamp || !signature) {
        return false;
    }

    // Session expires after 24 hours
    const age = Date.now() - Number(timestamp);

    if (age > 24 * 60 * 60 * 1000) {
        return false;
    }

    const expectedSignature = crypto
        .createHmac("sha256", SESSION_SECRET)
        .update(timestamp)
        .digest("hex");

    return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
    );
}

// ===============================
// DASHBOARD AUTH MIDDLEWARE
// ===============================

function requireDashboardAuth(req, res, next) {

    if (!isValidSession(req)) {

        return res.status(401).json({
            success: false,
            message: "Dashboard login required"
        });

    }

    next();
}

// ===============================
// CUSTOMER PAGE
// ===============================

app.get("/", (req, res) => {

    res.sendFile(
        path.join(__dirname, "customer.html")
    );

});

// ===============================
// DASHBOARD PAGE
// ===============================

app.get("/dashboard", (req, res) => {

    if (!isValidSession(req)) {

        return res.sendFile(
            path.join(__dirname, "dashboard-login.html")
        );

    }

    res.sendFile(
        path.join(__dirname, "dashboard.html")
    );

});

// ===============================
// DASHBOARD LOGIN
// ===============================

app.post("/api/dashboard/login", (req, res) => {

    const { password } = req.body;

    if (!password) {

        return res.status(400).json({
            success: false,
            message: "Password required"
        });

    }

    if (password !== DASHBOARD_PASSWORD) {

        return res.status(401).json({
            success: false,
            message: "Incorrect password"
        });

    }

    const token = createSessionToken();

    res.setHeader(
        "Set-Cookie",
        `${COOKIE_NAME}=${encodeURIComponent(token)}; HttpOnly; Path=/; SameSite=Lax; Max-Age=86400`
    );

    res.json({
        success: true,
        message: "Login successful"
    });

});

// ===============================
// DASHBOARD LOGOUT
// ===============================

app.post("/api/dashboard/logout", (req, res) => {

    res.setHeader(
        "Set-Cookie",
        `${COOKIE_NAME}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0`
    );

    res.json({
        success: true,
        message: "Logged out"
    });

});

// ===============================
// ORDERS STORAGE
// ===============================

let orders = [];

// ===============================
// PLACE NEW ORDER
// ===============================
// IMPORTANT:
// CUSTOMER ORDER API REMAINS PUBLIC.
// Customer ko password nahi chahiye.

app.post("/api/orders", (req, res) => {

    const { table, items, total } = req.body;

    if (
        !table ||
        !items ||
        !Array.isArray(items) ||
        items.length === 0
    ) {

        return res.status(400).json({
            success: false,
            message: "Invalid order"
        });

    }

    const order = {

        id: Date.now(),

        table: table,

        items: items,

        total: total,

        status: "NEW",

        createdAt:
            new Date().toLocaleString("en-IN")

    };

    orders.push(order);

    console.log("");
    console.log("=================================");
    console.log("          🔔 NEW ORDER");
    console.log("=================================");
    console.log("Order ID:", order.id);
    console.log("Table:", order.table);
    console.log("Total: ₹" + order.total);
    console.log("Status:", order.status);
    console.log("=================================");
    console.log("");

    res.json({

        success: true,

        message: "Order placed successfully",

        orderId: order.id

    });

});

// ===============================
// GET ALL ORDERS
// ===============================
// PROTECTED

app.get(
    "/api/orders",
    requireDashboardAuth,
    (req, res) => {

        res.json(orders);

    }
);

// ===============================
// UPDATE ORDER STATUS
// ===============================
// PROTECTED

app.patch(
    "/api/orders/:id/status",
    requireDashboardAuth,
    (req, res) => {

        const orderId =
            Number(req.params.id);

        const { status } = req.body;

        const allowedStatuses = [

            "NEW",
            "ACCEPTED",
            "PREPARING",
            "READY",
            "COMPLETED"

        ];

        if (!allowedStatuses.includes(status)) {

            return res.status(400).json({

                success: false,

                message: "Invalid status"

            });

        }

        const order = orders.find(
            item => item.id === orderId
        );

        if (!order) {

            return res.status(404).json({

                success: false,

                message: "Order not found"

            });

        }

        order.status = status;

        res.json({

            success: true,

            order: order

        });

    }
);

// ===============================
// DELETE ORDER
// ===============================
// PROTECTED

app.delete(
    "/api/orders/:id",
    requireDashboardAuth,
    (req, res) => {

        const orderId =
            Number(req.params.id);

        const index =
            orders.findIndex(
                item => item.id === orderId
            );

        if (index === -1) {

            return res.status(404).json({

                success: false,

                message: "Order not found"

            });

        }

        orders.splice(index, 1);

        res.json({

            success: true,

            message: "Order deleted"

        });

    }
);

// ===============================
// START SERVER
// ===============================

app.listen(
    PORT,
    "0.0.0.0",
    () => {

        console.log("");
        console.log("=================================");
        console.log("       EAT GUYZ CAFE SERVER");
        console.log("=================================");
        console.log(
            `Customer: http://localhost:${PORT}/`
        );
        console.log(
            `Dashboard: http://localhost:${PORT}/dashboard`
        );
        console.log(
            `Orders API: http://localhost:${PORT}/api/orders`
        );
        console.log("=================================");
        console.log("");

    }
);