import express from 'express';
import { KategorijeController } from '../controllers/kategorije.controller';
const kategorijeRouter = express.Router();

kategorijeRouter.route('/dohvatiSveKategorije').get(
    (req, res) => new KategorijeController().dohvatiSveKategorije(req, res)
)

kategorijeRouter.route('/dohvatiAktivneKategorije').get(
    (req, res) => new KategorijeController().dohvatiAktivneKategorije(req, res)
)

kategorijeRouter.route('/dodajKategoriju').post(
    (req, res) => new KategorijeController().dodajKategoriju(req, res)
)

kategorijeRouter.route('/dodajPotkategoriju').post(
    (req, res) => new KategorijeController().dodajPotkategoriju(req, res)
)

export default kategorijeRouter;
