import express from 'express';
import multer from 'multer';
import path from 'path';
import { ProizvodiController } from '../controllers/proizvodi.controller';
const proizvodiRouter = express.Router();

const skladiste = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '..', '..', 'uploads', 'products'))
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

proizvodiRouter.route('/dohvatiSveProizvode').get(
    (req, res) => new ProizvodiController().dohvatiSveProizvode(req, res)
)

proizvodiRouter.route('/dohvatiProizvod/:sifra').get(
    (req, res) => new ProizvodiController().dohvatiProizvod(req, res)
)

proizvodiRouter.route('/top5Proizvoda').get(
    (req, res) => new ProizvodiController().top5Proizvoda(req, res)
)

proizvodiRouter.route('/pretraziProizvode').post(
    (req, res) => new ProizvodiController().pretraziProizvode(req, res)
)

proizvodiRouter.route('/dohvatiProizvodeStampara/:kor_ime').get(
    (req, res) => new ProizvodiController().dohvatiProizvodeStampara(req, res)
)

proizvodiRouter.route('/dodajProizvod').post(
    (req, res) => new ProizvodiController().dodajProizvod(req, res)
)

proizvodiRouter.route('/dodajViseProizvoda').post(
    (req, res) => new ProizvodiController().dodajViseProizvoda(req, res)
)

proizvodiRouter.route('/azurirajSliku').post(
    (req, res) => new ProizvodiController().azurirajSliku(req, res)
)

proizvodiRouter.route('/dodajUslugu').post(
    (req, res) => new ProizvodiController().dodajUslugu(req, res)
)

proizvodiRouter.route('/dodajDodatnuSliku').post(
    (req, res) => new ProizvodiController().dodajDodatnuSliku(req, res)
)

proizvodiRouter.route('/ukloniDodatnuSliku').post(
    (req, res) => new ProizvodiController().ukloniDodatnuSliku(req, res)
)

proizvodiRouter.route('/azurirajKolicinu').post(
    (req, res) => new ProizvodiController().azurirajKolicinu(req, res)
)

proizvodiRouter.route('/obrisiProizvod/:sifra').post(
    (req, res) => new ProizvodiController().obrisiProizvod(req, res)
)

proizvodiRouter.route('/oceniProizvod').post(
    (req, res) => new ProizvodiController().oceniProizvod(req, res)
)

proizvodiRouter.route('/dodajKomentar').post(
    (req, res) => new ProizvodiController().dodajKomentar(req, res)
)

proizvodiRouter.route('/upload').post(
    (req, res, next) => otpremanje.single('slika')(req, res, err => {
        if (err) {
            console.log(err)
            res.json(null)
            return
        }
        next()
    }),
    (req, res) => new ProizvodiController().upload(req, res)
)

export default proizvodiRouter;
