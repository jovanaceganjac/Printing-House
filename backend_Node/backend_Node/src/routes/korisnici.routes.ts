import express from 'express';
import multer from 'multer';
import path from 'path';
import { KorisniciController } from '../controllers/korisnici.controller';
const korisniciRouter = express.Router();

const skladiste = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '..', '..', 'uploads', 'profile'))
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '_' + file.originalname.replace(/[^A-Za-z0-9.]/g, '_'))
    }
})

const otpremanje = multer({
    storage: skladiste,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        let ekstenzija = path.extname(file.originalname).toLowerCase()
        let dozvoljenTip = ['image/jpeg', 'image/png', 'image/gif'].indexOf(file.mimetype) >= 0
        if (dozvoljenTip && (ekstenzija == '.jpg' || ekstenzija == '.jpeg' || ekstenzija == '.png' || ekstenzija == '.gif')) {
            cb(null, true)
        }
        else {
            cb(null, false)
        }
    }
})

korisniciRouter.route('/prijava').post(
    (req, res) => new KorisniciController().prijava(req, res)
)

korisniciRouter.route('/registracija').post(
    (req, res) => new KorisniciController().registracija(req, res)
)

korisniciRouter.route('/zaboravljenaLozinka').post(
    (req, res) => new KorisniciController().zaboravljenaLozinka(req, res)
)

korisniciRouter.route('/postaviNovuLozinku').post(
    (req, res) => new KorisniciController().postaviNovuLozinku(req, res)
)

korisniciRouter.route('/upload').post(
    (req, res, next) => otpremanje.single('slika')(req, res, err => {
        if (err) {
            console.log(err)
            res.json(null)
            return
        }
        next()
    }),
    (req, res) => new KorisniciController().upload(req, res)
)

korisniciRouter.route('/azurirajKorisnika').post(
    (req, res) => new KorisniciController().azurirajKorisnika(req, res)
)

korisniciRouter.route('/dohvatiKorisnika/:kor_ime').get(
    (req, res) => new KorisniciController().dohvatiKorisnika(req, res)
)

korisniciRouter.route('/odobriKorisnika/:kor_ime').post(
    (req, res) => new KorisniciController().odobriKorisnika(req, res)
)

korisniciRouter.route('/odbijKorisnika/:kor_ime').post(
    (req, res) => new KorisniciController().odbijKorisnika(req, res)
)

korisniciRouter.route('/obrisiKorisnika/:kor_ime').post(
    (req, res) => new KorisniciController().obrisiKorisnika(req, res)
)

korisniciRouter.route('/dohvatiNeodobrene').get(
    (req, res) => new KorisniciController().dohvatiNeodobrene(req, res)
)

korisniciRouter.route('/dohvatiSveKorisnike').get(
    (req, res) => new KorisniciController().dohvatiSveKorisnike(req, res)
)

korisniciRouter.route('/brojStamparija').get(
    (req, res) => new KorisniciController().brojStamparija(req, res)
)

export default korisniciRouter;
