const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken')

const userSchema = new mongoose.Schema({
    username : {
        type: String,
        unique: true,
        trim: true,
        index: true,
        required: true
    },
    password : {
        type: String,
        unique: true,
        trim: true,
        required: [true, 'Password is Required']
    },
    email : {
        type: String,
        unique: true,
        trim: true,
        required: true
    },
    fullName : {
        type: String,
        unique: true,
        required: true,
        index: true
    },
    avatar : {
        type: String,
        required: true
    },
    coverImg : {
        type: String
    },
    watchHistory: [
        {
            type: mongoose.Schema.Types.ObjectId(),
            ref: "Video"
        }
    ],
    refreshToken: {
        type: String,
    }
}, {timestamps: true});


userSchema.pre("save", async function(next){
    if(!this.isModified("password")) return next();
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

userSchema.methods.isPasswordCorrect = async function(inputPassword){
    return await bcrypt.compare(inputPassword, this.password);
};

userSchema.methods.generateAccessToken = function(){
    return jwt.sign({
        _id: this._id,
        username: this.username,
        email: this.email,
        fullName: this.fullName
    },
    process.env.ACCESS_TOKEN_SECRET,
    {
        expiresIn: process.env.ACCESS_TOKEN_EXPIRTY
    }
    )
};


userSchema.methods.generateRefreshToken = function(){
    return jwt.sign({
        _id: this._id,
    },
    process.env.REFRESH_TOKEN_SECRET,
    {
        expiresIn: process.env.REFRESH_TOKEN_EXPIRTY
    }
    )
}




module.exports = mongoose.model('User', userSchema);