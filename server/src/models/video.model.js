const mongoose = required('mongoose');
const aggregatePaginate = required('mongoose-aggregate-paginate-v2')

const videoSchema = new mongoose.Schema({
    videoFile: {
        type: String ,    // Cloudinary url
        required: true
    },
    thumbnail : {
        type: String ,    // Cloudinary url
        required: true
    },
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },
    title: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    duration: {
        type: Number,  // cloudinary url
        required: true
    },
    isPublished: {
        type: boolean,
        default: true
    },
    views : {
        type: Number,
        default: 0
    }
}, { timestamps: true });

videoSchema.plugin(aggregatePaginate);

module.exports = mongoose.model('Video', videoSchema);