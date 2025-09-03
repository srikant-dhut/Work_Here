const listMessages = async (req, res) => {
  return res.status(200).json({ message: "List messages", data: [] });
};

const getMessageById = async (req, res) => {
  const { id } = req.params;
  return res.status(200).json({ message: "Get message", id });
};

const createMessage = async (req, res) => {
  return res.status(201).json({ message: "Create message", body: req.body });
};

const updateMessage = async (req, res) => {
  const { id } = req.params;
  return res.status(200).json({ message: "Update message", id, body: req.body });
};

const deleteMessage = async (req, res) => {
  const { id } = req.params;
  return res.status(200).json({ message: "Delete message", id });
};

module.exports = {
  listMessages,
  getMessageById,
  createMessage,
  updateMessage,
  deleteMessage,
};


