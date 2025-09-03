const Message = require('../../model/MessageModel');
const Job = require('../../model/JobModel');
const User = require('../../model/userModel').User;
const mongoose = require('mongoose');

class MessageController {
  //Send a message for client and freelancer
  async sendMessage(req, res) {
    try {
      const { recipientId, jobId, content, messageType = 'text' } = req.body;
      const senderId = req.user.userId;

      //Validate input
      if (!recipientId || !jobId || !content) {
        req.flash('error_msg', 'All fields are required');
        return res.redirect('back');
      }

      //Check if job exists and user is involved
      const job = await Job.findById(jobId);
      if (!job) {
        req.flash('error_msg', 'Job not found');
        return res.redirect('back');
      }

      //Check if sender is client or accepted freelancer
      const isClient = job.client.toString() === senderId;
      const isAcceptedFreelancer = job.acceptedFreelancer && job.acceptedFreelancer.toString() === senderId;

      if (!isClient && !isAcceptedFreelancer) {
        req.flash('error_msg', 'You are not authorized to send messages for this job');
        return res.redirect('back');
      }

      //Determine recipient
      let actualRecipientId;
      if (isClient) {
        actualRecipientId = job.acceptedFreelancer;
      } else {
        actualRecipientId = job.client;
      }

      if (!actualRecipientId) {
        req.flash('error_msg', 'No recipient found for this job');
        return res.redirect('back');
      }

      //Create message
      const message = new Message({
        sender: senderId,
        recipient: actualRecipientId,
        job: jobId,
        content: content.trim(),
        messageType
      });

      await message.save();

      // ⬅️ UPDATED: Emit socket event after saving
      const io = req.app.get("io");
      io.to(jobId.toString()).emit("messageReceived", {
        sender: { _id: senderId, name: req.user.name }, // you can fetch more
        content: content.trim(),
        createdAt: new Date(),
        jobId: jobId.toString(),
      });

      req.flash('success_msg', 'Message sent successfully');

      // Redirect based on user role
      if (req.user.role === 'freelancer') {
        res.redirect(`/freelancer/messages/${jobId}`);
      } else {
        res.redirect(`/messages/${jobId}`);
      }

    } catch (error) {
      console.error('Error sending message:', error);
      req.flash('error_msg', 'Failed to send message');
      res.redirect('back');
    }
  }

  //Get conversation for a specific job for client
  async getJobConversation(req, res) {
    try {
      const { jobId } = req.params;
      const userId = req.user.userId;
      const userObjectId = new mongoose.Types.ObjectId(userId);

      //Find job with client + acceptedFreelancer using aggregation
      const jobResult = await Job.aggregate([
        { $match: { _id: new mongoose.Types.ObjectId(jobId) } },
        {
          $lookup: {
            from: "users",
            localField: "client",
            foreignField: "_id",
            as: "client"
          }
        },
        { $unwind: "$client" },
        {
          $lookup: {
            from: "users",
            localField: "acceptedFreelancer",
            foreignField: "_id",
            as: "acceptedFreelancer"
          }
        },
        { $unwind: { path: "$acceptedFreelancer", preserveNullAndEmptyArrays: true } },
        {
          $project: {
            title: 1,
            description: 1,
            status: 1,
            budget: 1,
            deadline: 1,
            client: { _id: 1, name: 1, email: 1 },
            acceptedFreelancer: { _id: 1, name: 1, email: 1 }
          }
        }
      ]);

      const job = jobResult[0];
      if (!job) {
        req.flash("error_msg", "Job not found");
        return res.redirect("/clientPage");
      }

      const isClient = job.client._id.toString() === userId;
      const isAcceptedFreelancer =
        job.acceptedFreelancer &&
        job.acceptedFreelancer._id.toString() === userId;

      if (!isClient && !isAcceptedFreelancer) {
        req.flash("error_msg", "Unauthorized access");
        return res.redirect("/clientPage");
      }

      //Messages with sender + recipient details
      const messages = await Message.aggregate([
        { $match: { job: new mongoose.Types.ObjectId(jobId) } },
        { $sort: { createdAt: 1 } },
        {
          $lookup: {
            from: "users",
            localField: "sender",
            foreignField: "_id",
            as: "sender"
          }
        },
        { $unwind: "$sender" },
        {
          $lookup: {
            from: "users",
            localField: "recipient",
            foreignField: "_id",
            as: "recipient"
          }
        },
        { $unwind: "$recipient" },
        {
          $project: {
            content: 1,
            createdAt: 1,
            isRead: 1,
            readAt: 1,
            "sender._id": 1,
            "sender.name": 1,
            "sender.email": 1,
            "recipient._id": 1,
            "recipient.name": 1,
            "recipient.email": 1
          }
        }
      ]);

      //Mark messages as read for recipient
      await Message.updateMany(
        { job: jobId, recipient: userId, isRead: false },
        { $set: { isRead: true, readAt: new Date() } }
      );

      const user = await User.findById(userId);
      res.render("jobConversation", {
        job,
        messages,
        user,
        isAuthenticated: true,
        isClient,
        isAcceptedFreelancer
      });
    } catch (error) {
      console.error("Error getting conversation:", error);
      req.flash("error_msg", "Failed to load conversation");
      res.redirect("/clientPage");
    }
  }

  //Get user's message inbox for client
  async getMessageInbox(req, res) {
    try {
      const userId = req.user.userId;
      const userObjectId = new mongoose.Types.ObjectId(userId);

      //Get all conversations where user is involved
      const conversations = await Message.aggregate([
        {
          $match: {
            $or: [
              { sender: userObjectId },
              { recipient: userObjectId }
            ]
          }
        },
        {
          $group: {
            _id: "$job",
            lastMessage: { $last: "$$ROOT" },
            unreadCount: {
              $sum: {
                $cond: [
                  { $and: [{ $eq: ["$recipient", userObjectId] }, { $eq: ["$isRead", false] }] },
                  1,
                  0
                ]
              }
            }
          }
        },
        { $sort: { "lastMessage.createdAt": -1 } }
      ]);

      //Manually fetch job & user details (no populate)
      const populatedConversations = await Promise.all(
        conversations.map(async (conv) => {
          const job = await Job.aggregate([
            { $match: { _id: new mongoose.Types.ObjectId(conv._id) } },
            {
              $lookup: {
                from: "users",
                localField: "client",
                foreignField: "_id",
                as: "client"
              }
            },
            { $unwind: "$client" },
            {
              $lookup: {
                from: "users",
                localField: "acceptedFreelancer",
                foreignField: "_id",
                as: "acceptedFreelancer"
              }
            },
            { $unwind: { path: "$acceptedFreelancer", preserveNullAndEmptyArrays: true } },
            {
              $project: {
                title: 1,
                status: 1,
                budget: 1,
                deadline: 1,
                client: { _id: 1, name: 1, email: 1 },
                acceptedFreelancer: { _id: 1, name: 1, email: 1 }
              }
            }
          ]);

          const jobData = job[0] || null;
          if (!jobData) return null; // ✅ Skip if job not found

          const otherUserId =
            conv.lastMessage.sender.toString() === userId
              ? conv.lastMessage.recipient
              : conv.lastMessage.sender;

          const otherUser = await User.findById(otherUserId, "name email");

          return {
            job: jobData,
            otherUser,
            lastMessage: conv.lastMessage,
            unreadCount: conv.unreadCount
          };
        })
      );

      // ✅ Filter out nulls
      const finalConversations = populatedConversations.filter(c => c !== null);

      const user = await User.findById(userId);

      res.render("messageInbox", {
        conversations: finalConversations,
        user,
        isAuthenticated: true
      });

    } catch (error) {
      console.error("Error getting message inbox:", error);
      req.flash("error_msg", "Failed to load messages");
      res.redirect("/freelancer/dashboard");
    }
  }


  //Get conversation for a specific job for freelancer (router have in MessageRouter)
  async freelancerGetJobConversation(req, res) {
    try {
      const { jobId } = req.params;
      const userId = req.user.userId;
      const userObjectId = new mongoose.Types.ObjectId(userId);

      //Find job with client + acceptedFreelancer using aggregation
      const jobResult = await Job.aggregate([
        { $match: { _id: new mongoose.Types.ObjectId(jobId) } },
        {
          $lookup: {
            from: "users",
            localField: "client",
            foreignField: "_id",
            as: "client"
          }
        },
        { $unwind: "$client" },
        {
          $lookup: {
            from: "users",
            localField: "acceptedFreelancer",
            foreignField: "_id",
            as: "acceptedFreelancer"
          }
        },
        { $unwind: { path: "$acceptedFreelancer", preserveNullAndEmptyArrays: true } },
        {
          $project: {
            title: 1,
            description: 1,
            status: 1,
            budget: 1,
            deadline: 1,
            client: { _id: 1, name: 1, email: 1 },
            acceptedFreelancer: { _id: 1, name: 1, email: 1 }
          }
        }
      ]);

      const job = jobResult[0];
      if (!job) {
        req.flash("error_msg", "Job not found");
        return res.redirect("/freelancer/dashboard");
      }

      const isClient = job.client._id.toString() === userId;
      const isAcceptedFreelancer =
        job.acceptedFreelancer &&
        job.acceptedFreelancer._id.toString() === userId;

      if (!isClient && !isAcceptedFreelancer) {
        req.flash("error_msg", "Unauthorized access");
        return res.redirect("/freelancer/dashboard");
      }

      //Messages with sender + recipient details
      const messages = await Message.aggregate([
        { $match: { job: new mongoose.Types.ObjectId(jobId) } },
        { $sort: { createdAt: 1 } },
        {
          $lookup: {
            from: "users",
            localField: "sender",
            foreignField: "_id",
            as: "sender"
          }
        },
        { $unwind: "$sender" },
        {
          $lookup: {
            from: "users",
            localField: "recipient",
            foreignField: "_id",
            as: "recipient"
          }
        },
        { $unwind: "$recipient" },
        {
          $project: {
            content: 1,
            createdAt: 1,
            isRead: 1,
            readAt: 1,
            "sender._id": 1,
            "sender.name": 1,
            "sender.email": 1,
            "recipient._id": 1,
            "recipient.name": 1,
            "recipient.email": 1
          }
        }
      ]);

      //Mark messages as read for recipient
      await Message.updateMany(
        { job: jobId, recipient: userId, isRead: false },
        { $set: { isRead: true, readAt: new Date() } }
      );

      const user = await User.findById(userId);
      res.render("freelancerJobConversation", {
        job,
        messages,
        user,
        isAuthenticated: true,
        isClient,
        isAcceptedFreelancer
      });
    } catch (error) {
      console.error("Error getting conversation:", error);
      req.flash("error_msg", "Failed to load conversation");
      res.redirect("/freelancer/dashboard");
    }
  }

  //Get message inbox for freelancer (router have in MessageRouter)
  async freelancerGetMessageInbox(req, res) {
    try {
      const userId = req.user.userId;
      const userObjectId = new mongoose.Types.ObjectId(userId);

      //Get all conversations where user is involved
      const conversations = await Message.aggregate([
        {
          $match: {
            $or: [
              { sender: userObjectId },
              { recipient: userObjectId }
            ]
          }
        },
        {
          $group: {
            _id: "$job",
            lastMessage: { $last: "$$ROOT" },
            unreadCount: {
              $sum: {
                $cond: [
                  { $and: [{ $eq: ["$recipient", userObjectId] }, { $eq: ["$isRead", false] }] },
                  1,
                  0
                ]
              }
            }
          }
        },
        { $sort: { "lastMessage.createdAt": -1 } }
      ]);

      //Manually fetch job & user details (no populate)
      const populatedConversations = await Promise.all(
        conversations.map(async (conv) => {
          const jobAgg = await Job.aggregate([
            { $match: { _id: new mongoose.Types.ObjectId(conv._id) } },
            {
              $lookup: {
                from: "users",
                localField: "client",
                foreignField: "_id",
                as: "client"
              }
            },
            { $unwind: "$client" },
            {
              $lookup: {
                from: "users",
                localField: "acceptedFreelancer",
                foreignField: "_id",
                as: "acceptedFreelancer"
              }
            },
            { $unwind: { path: "$acceptedFreelancer", preserveNullAndEmptyArrays: true } },
            {
              $project: {
                title: 1,
                status: 1,
                budget: 1,
                deadline: 1,
                client: { _id: 1, name: 1, email: 1 },
                acceptedFreelancer: { _id: 1, name: 1, email: 1 }
              }
            }
          ]);

          // If job not found, provide placeholder
          const jobData = jobAgg[0] || { _id: null, title: "Job Deleted" };

          const otherUserId =
            conv.lastMessage.sender.toString() === userId
              ? conv.lastMessage.recipient
              : conv.lastMessage.sender;

          const otherUser = await User.findById(otherUserId, "name email");

          return {
            job: jobData,
            otherUser,
            lastMessage: conv.lastMessage,
            unreadCount: conv.unreadCount
          };
        })
      );

      const user = await User.findById(userId);

      res.render("freelancerMessageInbox", {
        conversations: populatedConversations,
        user,
        isAuthenticated: true
      });

    } catch (error) {
      console.error("Error getting message inbox:", error);
      req.flash("error_msg", "Failed to load messages");
      res.redirect("/freelancer/dashboard");
    }
  }


}

module.exports = new MessageController();
