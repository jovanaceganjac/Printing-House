import mongoose from 'mongoose'

const Schema = mongoose.Schema;

let StavkaNabavke = new Schema({
    sifra: String,
    naziv: String,
    potkategorija: String,
    kolicina: Number
})

let StavkaPonude = new Schema({
    sifra: String,
    sifra_proizvoda: String,
    naziv_proizvoda: String,
    cena_po_komadu: Number
})

let Ponuda = new Schema({
    id_ponude: Number,
    stampar: String,
    ukupna_cena: Number,
    datum: Date,
    stavke: [StavkaPonude]
})

let JavnaNabavka = new Schema({
    id_nabavke: Number,
    klijent: String,
    datum: Date,
    status: String,
    stavke: [StavkaNabavke],
    ponude: [Ponuda],
    pobednik: String
})

export default mongoose.model('JavnaNabavkaModel', JavnaNabavka, 'javne_nabavke');
