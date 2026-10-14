import express from 'express';
import { FaktureController } from '../controllers/fakture.controller';
const faktureRouter = express.Router();

faktureRouter.route('/dohvatiFaktureKlijenta/:kor_ime').get(
    (req, res) => new FaktureController().dohvatiFaktureKlijenta(req, res)
)

faktureRouter.route('/dohvatiFaktureStampara/:kor_ime').get(
    (req, res) => new FaktureController().dohvatiFaktureStampara(req, res)
)

faktureRouter.route('/pdf/:id_fakture').get(
    (req, res) => new FaktureController().preuzmiPdf(req, res)
)

faktureRouter.route('/statistika/promet').get(
    (req, res) => new FaktureController().statistikaPromet(req, res)
)

faktureRouter.route('/statistika/naruceni').get(
    (req, res) => new FaktureController().statistikaNaruceni(req, res)
)

faktureRouter.route('/statistika/ocene').get(
    (req, res) => new FaktureController().statistikaOcene(req, res)
)

faktureRouter.route('/dohvatiArhivu/:kor_ime').get(
    (req, res) => new FaktureController().dohvatiArhivu(req, res)
)

faktureRouter.route('/napraviFakture').post(
    (req, res) => new FaktureController().napraviFakture(req, res)
)

faktureRouter.route('/platiFakture').post(
    (req, res) => new FaktureController().platiFakture(req, res)
)

faktureRouter.route('/promeniStatus').post(
    (req, res) => new FaktureController().promeniStatus(req, res)
)

faktureRouter.route('/otkaziFakturu/:id_fakture').post(
    (req, res) => new FaktureController().otkaziFakturu(req, res)
)

export default faktureRouter;
