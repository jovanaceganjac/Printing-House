import mongoose from 'mongoose'

const Schema = mongoose.Schema;

let Stavka = new Schema({
    id_stavke: Number,
    sifra: String,
    naziv: String,
    kolicina: Number,
    boja: String,
    tip_stampe: String,
    cena_po_komadu: Number,
    ukupno: Number,
    tekst_stampe: String,
    slika_stampe: String
})

let Faktura = new Schema({
    id_fakture: Number,
    klijent: String,
    stampar: String,
    grad: String,
    datum: Date,
    status: String,
    ukupan_iznos: Number,
    stavke: [Stavka]
})

export default mongoose.model('FakturaModel', Faktura, 'fakture');
