const fs = require('fs')
const path = require('path')

module.paths.push(path.join(__dirname, '..', 'backend_Node', 'backend_Node', 'node_modules'))

const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')

const Schema = mongoose.Schema

const Korisnik = new Schema({
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

const Kategorija = new Schema({
    naziv: String,
    potkategorije: [String]
})

const UslugaStampe = new Schema({
    id_usluge: Number,
    tip_stampe: String,
    dodatna_cena_po_komadu: Number,
    max_sirina_mm: Number,
    max_visina_mm: Number
})

const Ocena = new Schema({
    kor_ime: String,
    vrednost: Number,
    datum: Date
})

const Komentar = new Schema({
    id_komentara: Number,
    kor_ime: String,
    datum: Date,
    tekst: String
})

const Proizvod = new Schema({
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

const Stavka = new Schema({
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

const StavkaNabavke = new Schema({
    sifra: String,
    naziv: String,
    potkategorija: String,
    kolicina: Number
})

const StavkaPonude = new Schema({
    sifra: String,
    sifra_proizvoda: String,
    naziv_proizvoda: String,
    cena_po_komadu: Number
})

const Ponuda = new Schema({
    id_ponude: Number,
    stampar: String,
    ukupna_cena: Number,
    datum: Date,
    stavke: [StavkaPonude]
})

const JavnaNabavka = new Schema({
    id_nabavke: Number,
    klijent: String,
    datum: Date,
    status: String,
    stavke: [StavkaNabavke],
    ponude: [Ponuda],
    pobednik: String
})

const Faktura = new Schema({
    id_fakture: Number,
    klijent: String,
    stampar: String,
    grad: String,
    datum: Date,
    status: String,
    ukupan_iznos: Number,
    stavke: [Stavka]
})

const KorisnikModel = mongoose.model('KorisnikModel', Korisnik, 'korisnici')
const KategorijaModel = mongoose.model('KategorijaModel', Kategorija, 'kategorije')
const ProizvodModel = mongoose.model('ProizvodModel', Proizvod, 'proizvodi')
const FakturaModel = mongoose.model('FakturaModel', Faktura, 'fakture')
const JavnaNabavkaModel = mongoose.model('JavnaNabavkaModel', JavnaNabavka, 'javne_nabavke')

function ucitaj(ime) {
    return JSON.parse(fs.readFileSync(path.join(__dirname, 'data', ime), 'utf8'))
}

function obrisiKolekciju(ime) {
    return mongoose.connection.db.collection(ime).drop().catch(() => null)
}

const imeBaze = process.argv[2] ? process.argv[2] : 'printing_house'

const korisnici = ucitaj('korisnici.json')
const kategorije = ucitaj('kategorije.json')
const proizvodi = ucitaj('proizvodi.json')
const fakture = ucitaj('fakture.json')

const najkasnijaFaktura = Math.max.apply(null, fakture.map(f => new Date(f.datum).getTime()))
const pomak = (Date.now() - 2 * 24 * 60 * 60 * 1000) - najkasnijaFaktura

function pomeri(datum) {
    return new Date(new Date(datum).getTime() + pomak)
}

fakture.forEach(f => {
    f.datum = pomeri(f.datum)
})
proizvodi.forEach(p => {
    (p.ocene || []).forEach(o => {
        o.datum = pomeri(o.datum)
    })
    ;(p.komentari || []).forEach(k => {
        k.datum = pomeri(k.datum)
    })
})

const javneNabavke = [
    {
        id_nabavke: 1,
        klijent: 'agencija_lux',
        datum: pomeri('2026-08-10T09:00:00.000Z'),
        status: 'zakljucena',
        stavke: [
            { sifra: 'p016', naziv: 'Flajer A6 jednostrani', potkategorija: 'Flajeri', kolicina: 1000 }
        ],
        ponude: [
            {
                id_ponude: 1,
                stampar: 'stamparija_subotica',
                ukupna_cena: 11000,
                datum: pomeri('2026-08-10T09:03:00.000Z'),
                stavke: [{ sifra: 'p016', sifra_proizvoda: 'p016', naziv_proizvoda: 'Flajer A6 jednostrani', cena_po_komadu: 11 }]
            },
            {
                id_ponude: 2,
                stampar: 'stamparija_beograd',
                ukupna_cena: 13000,
                datum: pomeri('2026-08-10T09:06:00.000Z'),
                stavke: [{ sifra: 'p016', sifra_proizvoda: 'p002', naziv_proizvoda: 'Flajer A5 kunstdruk', cena_po_komadu: 13 }]
            }
        ],
        pobednik: 'stamparija_subotica'
    },
    {
        id_nabavke: 2,
        klijent: 'agencija_lux',
        datum: new Date(Date.now() - 11 * 60 * 1000),
        status: 'otvorena',
        stavke: [
            { sifra: 'p001', naziv: 'Vizit karte mat 350g', potkategorija: 'Vizit karte', kolicina: 500 },
            { sifra: 'p003', naziv: 'Poster B1 sjajni', potkategorija: 'Posteri', kolicina: 10 }
        ],
        ponude: [
            {
                id_ponude: 1,
                stampar: 'stamparija_beograd',
                ukupna_cena: 14000,
                datum: new Date(Date.now() - 9 * 60 * 1000),
                stavke: [
                    { sifra: 'p001', sifra_proizvoda: 'p001', naziv_proizvoda: 'Vizit karte mat 350g', cena_po_komadu: 20 },
                    { sifra: 'p003', sifra_proizvoda: 'p003', naziv_proizvoda: 'Poster B1 sjajni', cena_po_komadu: 400 }
                ]
            },
            {
                id_ponude: 2,
                stampar: 'stamparija_kragujevac',
                ukupna_cena: 12500,
                datum: new Date(Date.now() - 8 * 60 * 1000),
                stavke: [
                    { sifra: 'p001', sifra_proizvoda: 'p013', naziv_proizvoda: 'Vizit karte sjajna plastifikacija', cena_po_komadu: 18 },
                    { sifra: 'p003', sifra_proizvoda: 'p015', naziv_proizvoda: 'Poster A0 foto papir', cena_po_komadu: 350 }
                ]
            }
        ],
        pobednik: ''
    }
]

const korisniciSaHesom = korisnici.map(korisnik => {
    const kopija = Object.assign({}, korisnik)
    kopija.lozinka = bcrypt.hashSync(korisnik.lozinka, 10)
    return kopija
})

mongoose.connect('mongodb://127.0.0.1:27017/' + imeBaze).then(() => {
    return obrisiKolekciju('korisnici')
        .then(() => obrisiKolekciju('kategorije'))
        .then(() => obrisiKolekciju('proizvodi'))
        .then(() => obrisiKolekciju('fakture'))
        .then(() => obrisiKolekciju('javne_nabavke'))
        .then(() => mongoose.connection.db.createCollection('korisnici'))
        .then(() => mongoose.connection.db.createCollection('kategorije'))
        .then(() => mongoose.connection.db.createCollection('proizvodi'))
        .then(() => mongoose.connection.db.createCollection('fakture'))
        .then(() => mongoose.connection.db.createCollection('javne_nabavke'))
        .then(() => KorisnikModel.insertMany(korisniciSaHesom))
        .then(() => KategorijaModel.insertMany(kategorije))
        .then(() => ProizvodModel.insertMany(proizvodi))
        .then(() => FakturaModel.insertMany(fakture))
        .then(() => JavnaNabavkaModel.insertMany(javneNabavke))
        .then(() => KorisnikModel.countDocuments({}))
        .then(brojKorisnika => {
            console.log('korisnici: ' + brojKorisnika)
            return KategorijaModel.countDocuments({})
        })
        .then(brojKategorija => {
            console.log('kategorije: ' + brojKategorija)
            return ProizvodModel.countDocuments({})
        })
        .then(brojProizvoda => {
            console.log('proizvodi: ' + brojProizvoda)
            return FakturaModel.countDocuments({})
        })
        .then(brojFaktura => {
            console.log('fakture: ' + brojFaktura)
            return JavnaNabavkaModel.countDocuments({})
        })
        .then(brojNabavki => {
            console.log('javne_nabavke: ' + brojNabavki)
            return mongoose.disconnect()
        })
}).catch(err => {
    console.log(err)
    mongoose.disconnect()
})
