import mongoose from 'mongoose'

const Schema = mongoose.Schema;

let Kategorija = new Schema({
    naziv: String,
    potkategorije: [String]
})

export default mongoose.model('KategorijaModel', Kategorija, 'kategorije');
