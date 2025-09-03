require("dotenv").config();
const express = require("express");
const app = express();
const http = require("http");
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);

const ejs = require("ejs");
const path = require("path");
const dbCon = require("./app/config/dbConnect");
const cookieParser = require("cookie-parser");
const ejsRoutes = require("./app/router/EjsRouter/indexRouter");
const session = require("express-session");
const flash = require("connect-flash");
const checkAuthentication = require("./app/middlewere/checkAuthentication");
const apiRoutes = require("./app/router/ApiRouter");
const swaggerUi = require("swagger-ui-express");
const openapi = require("./docs/openapi.json");
const cors = require("cors");
const Message = require("./app/model/MessageModel");


dbCon();


app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use(
  session({
    secret: process.env.FLASH_SECRET,
    saveUninitialized: true,
    resave: true,
  })
);

app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

app.use(flash());
app.use((req, res, next) => {
  res.locals.success_msg = req.flash("success_msg");
  res.locals.error_msg = req.flash("error_msg");
  res.locals.delete_msg = req.flash("delete_msg");
  next();
});


app.set("view engine", "ejs");
app.set("views", "views");


app.use(express.static(path.join(__dirname, "uploads")));
app.use("/uploads", express.static("uploads"));
app.use(express.static(path.join(__dirname, "public")));


app.use(checkAuthentication);


app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(openapi));
app.use("/api", apiRoutes);
app.use(ejsRoutes);


io.on("connection", (socket) => {
  //console.log("A user connected:", socket.id);

  //Join job-specific room
  socket.on("joinJob", (jobId) => {
    socket.join(jobId);
    //console.log(`User joined job room: ${jobId}`);
  });

  //Broadcast new messages
  socket.on("newMessage", (data) => {
    io.to(data.jobId).emit("messageReceived", data);
  });

  //Handle typing indicators
  socket.on("typing", (data) => {
    socket.to(data.jobId).emit("userTyping", data);
  });

  //Handle user online status
  socket.on("userOnline", (data) => {
    socket.to(data.jobId).emit("userStatusChanged", { 
      userId: data.userId, 
      userName: data.userName, 
      status: 'online' 
    });
  });

  //Handle user offline status
  socket.on("userOffline", (data) => {
    socket.to(data.jobId).emit("userStatusChanged", { 
      userId: data.userId, 
      userName: data.userName, 
      status: 'offline' 
    });
  });

  //Mark as read
  socket.on("markAsRead", async ({ messageId, userId, jobId }) => {
    try {
      const message = await Message.findById(messageId);
      if (message && message.recipient.toString() === userId) {
        message.isRead = true;
        message.readAt = new Date();
        await message.save();

        io.to(jobId).emit("messageRead", {
          messageId,
          readerId: userId,
          readAt: message.readAt,
        });
      }
    } catch (err) {
      //console.error("Error in markAsRead:", err);
    }
  });

  socket.on("disconnect", () => {
    //console.log("User disconnected:", socket.id);
  });
});

//Make io available in controllers
app.set("io", io);


const port = process.env.PORT || 3000;
server.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
 