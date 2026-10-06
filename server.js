const express = require("express");
const path = require("path");

const app = express();
const PORT = 3000;

app.use(express.json());

// ===============================
// CUSTOMER PAGE
// ===============================
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "customer.html"));
});

// ===============================
// DASHBOARD PAGE
// ===============================
app.get("/dashboard", (req, res) => {
    res.sendFile(path.join(__dirname, "dashboard.html"));
});

// ===============================
// ORDERS STORAGE
// ===============================
let orders = [];

// ===============================
// PLACE NEW ORDER
// ===============================
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
        createdAt: new Date().toLocaleString("en-IN")
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
app.get("/api/orders", (req, res) => {
    res.json(orders);
});

// ===============================
// UPDATE ORDER STATUS
// ===============================
app.patch("/api/orders/:id/status", (req, res) => {

    const orderId = Number(req.params.id);
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
        (item) => item.id === orderId
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
});

// ===============================
// DELETE ORDER
// ===============================
app.delete("/api/orders/:id", (req, res) => {

    const orderId = Number(req.params.id);

    const index = orders.findIndex(
        (item) => item.id === orderId
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
});

// ===============================
// START SERVER
// ===============================
app.listen(PORT, "0.0.0.0", () => {

    console.log("");
    console.log("=================================");
    console.log("       EAT GUYZ CAFE SERVER");
    console.log("=================================");
    console.log(`Customer: http://localhost:${PORT}/`);
    console.log(`Dashboard: http://localhost:${PORT}/dashboard`);
    console.log(`Orders API: http://localhost:${PORT}/api/orders`);
    console.log("=================================");
    console.log("");
});