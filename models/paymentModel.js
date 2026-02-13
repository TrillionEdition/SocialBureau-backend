
// const userPaymentSchema = new mongoose.Schema({
//   name: {
//     type: String,
//     required: true,
//     trim: true,
//   },
//   email: {
//     type: String,
//     required: true,
//     unique: true,
//     lowercase: true,
//     match: /^\w+([\\.-]?\w+)*@\w+([\\.-]?\w+)*(\.\w{2,3})+$/,
//   },
//   phone: {
//     type: String,
//     trim: true,
//   },
//   password: {
//     type: String,
//     required: true,
//     minlength: 6,
//   },
//   profilePicture: {
//     type: String,
//     default: null,
//   },
//   currentSubscription: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'Subscription',
//     default: null,
//   },
//   subscriptionHistory: [{
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'Subscription',
//   }],
//   isActive: {
//     type: Boolean,
//     default: true,
//   },
//   createdAt: {
//     type: Date,
//     default: Date.now,
//   },
//   updatedAt: {
//     type: Date,
//     default: Date.now,
//   },
// });

// const UserPayment = mongoose.model('UserPayment', userPaymentSchema);