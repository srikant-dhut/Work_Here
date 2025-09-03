const listAdmins = async (req, res) => {
  return res.status(200).json({ message: "List admins", data: [] });
};

const getAdminById = async (req, res) => {
  const { id } = req.params;
  return res.status(200).json({ message: "Get admin", id });
};

const createAdmin = async (req, res) => {
  return res.status(201).json({ message: "Create admin", body: req.body });
};

const updateAdmin = async (req, res) => {
  const { id } = req.params;
  return res.status(200).json({ message: "Update admin", id, body: req.body });
};

const deleteAdmin = async (req, res) => {
  const { id } = req.params;
  return res.status(200).json({ message: "Delete admin", id });
};

module.exports = {
  listAdmins,
  getAdminById,
  createAdmin,
  updateAdmin,
  deleteAdmin,
};


