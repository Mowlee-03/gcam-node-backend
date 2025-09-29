// socket.js
module.exports = (server, app) => {
  const { Server } = require("socket.io");

  const io = new Server(server, {
    cors: {
      origin: "*", // Replace with your frontend URL in production
      methods: ["GET", "POST"],
    },
  });

  // Make io accessible in controllers
  app.locals.io = io;

console.log("✅ Socket.IO initialized and listening for connections");
  io.on("connection", (socket) => {
    console.log("🔌 New client connected:", socket.id);

    // Join a device room
    socket.on("joinDeviceRoom", (deviceId) => {
    //   // Optional: validate that the user can access this device
    //   const hasAccess = await db.installedDevice.findFirst({
    //     where: { id: deviceId, user_id: userId }, // adjust field names
    //   });

    //   if (hasAccess) {
        socket.join(`device_${deviceId}`);
        console.log(`Socket ${socket.id} joined room device_${deviceId}`);
    //   } else {
    //     socket.emit("error", "Unauthorized for this device");
    //   }
    });

    // Leave a device room
    socket.on("leaveDeviceRoom", (deviceId) => {
      socket.leave(`device_${deviceId}`);
      console.log(`Socket ${socket.id} left room device_${deviceId}`);
    });

    socket.on("disconnect", () => {
      console.log("Client disconnected:", socket.id);
    });
  });

  return io;
};
