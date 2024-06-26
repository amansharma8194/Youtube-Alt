const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const tweetSchema = new Schema({
    content: {
        type: String,
        required: true
    },
    owner: {
        type: Schema.Types.ObjectId,
        ref: "User"
    }
}, {timestamps: true})


module.exports = mongoose.model("Tweet", tweetSchema)