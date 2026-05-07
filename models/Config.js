import mongoose from 'mongoose';

const configSchema = new mongoose.Schema({
  bride: {name:String, father: String, mother:String,address:String, instagram:String},
  groom: {name:String, father: String, mother:String,address:String, instagram:String},
  otherFamily: [{name:String,}],
  events: [{name:String,date:Date,time:String,location:String}],
  maps:{address:String,venue:String,iframe:String,href:String},
  eventDate: Date,
  gallery: [{imageUrl:String}],
  polaroidPhoto: [{imageUrl:String}],
  bankAccounts: [{
    bank: String,
    account: String,
    name: String
  }],
  bgmUrl: { type: String, default: '/music/default-bgm.mp3' },
  dashboardPassword: String
});

export default mongoose.model('Config', configSchema);