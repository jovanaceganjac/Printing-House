import mongoose from 'mongoose'

const Schema = mongoose.Schema;

let Korisnik = new Schema({
    kor_ime: String,
    lozinka: String,
    ime: String,
    prezime: String,
    telefon: String,
    email: String,
    slika: String,
    tip: String,
    status: String,
    naziv_institucije: String,
    adresa_sedista: String,
    maticni_broj: String,
    pib: String,
    grad: String,
    lat: Number,
    lon: Number,
    reset_token: String,
    reset_istek: Date
})

export default mongoose.model('KorisnikModel', Korisnik, 'korisnici');
