module.exports = async (client, message, state, idUser) => {
  if (message.author.id !== idUser) return;
  if (message.content !== "TT") return;

  if (!state.paused && !state.captcha) {
    console.log("▶️ Bot đang chạy rồi");
  } else {
    state.paused = false;
    state.captcha = false;
    await message.edit("RESUME");
    console.log("▶️ Resume — pause + captcha cleared");
  }
};