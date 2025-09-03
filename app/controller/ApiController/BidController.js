const listBids = async (req, res) => {
  return res.status(200).json({ message: "List bids", data: [] });
};

const getBidById = async (req, res) => {
  const { id } = req.params;
  return res.status(200).json({ message: "Get bid", id });
};

const createBid = async (req, res) => {
  return res.status(201).json({ message: "Create bid", body: req.body });
};

const updateBid = async (req, res) => {
  const { id } = req.params;
  return res.status(200).json({ message: "Update bid", id, body: req.body });
};

const deleteBid = async (req, res) => {
  const { id } = req.params;
  return res.status(200).json({ message: "Delete bid", id });
};

module.exports = {
  listBids,
  getBidById,
  createBid,
  updateBid,
  deleteBid,
};


