const sendEmail = async ({ to, subject }) => {
  return {
    success: true,
    message: `Email service is not configured yet for ${to} (${subject}).`
  };
};

module.exports = {
  sendEmail
};
