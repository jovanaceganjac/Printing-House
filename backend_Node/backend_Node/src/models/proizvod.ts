import mongoose from 'mongoose'

const Schema = mongoose.Schema;

let UslugaStampe = new Schema({
    id_usluge: Number,
    tip_stampe: String,
    dodatna_cena_po_komadu: Number,
    max_sirina_mm: Number,
    max_visina_mm: Number
})

let Ocena = new Schema({
    kor_ime: String,
    vrednost: Number,
    datum: Date
})

let Komentar = new Schema({
    id_komentara: Number,
    kor_ime: String,
    datum: Date,
    tekst: String
})

let Proizvod = new Schema({
    sifra: String,
    naziv: String,
    opis: String,
    kategorija: String,
    potkategorija: String,
    jedinicna_cena: Number,
    kolicina_na_lageru: Number,
    dostupne_boje: [String],
    slika: String,
    dodatne_slike: [String],
    stampar: String,
    grad: String,
    usluge_stampe: [UslugaStampe],
    broj_svidjanja: Number,
    broj_nesvidjanja: Number,
    ocene: [Ocena],
    komentari: [Komentar]
})

export default mongoose.model('ProizvodModel', Proizvod, 'proizvodi');
