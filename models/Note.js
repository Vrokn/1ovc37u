const mongoose = require("mongoose");

const NoteSchema = new mongoose.Schema({
  title: { type: String },
  body: { type: String }
});
NoteSchema.methods.truncateBody = function() {
  if (this.body && this.body.length > 75) {
    return this.body.substring(0, 70) + " ...";
  }
  return this.body;
};
module.exports = mongoose.model("Note", NoteSchema);