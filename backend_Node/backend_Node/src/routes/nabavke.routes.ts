import express from 'express';
import { NabavkeController } from '../controllers/nabavke.controller';
const nabavkeRouter = express.Router();

nabavkeRouter.route('/raspisiNabavku').post(
    (req, res) => new NabavkeController().raspisiNabavku(req, res)
)

nabavkeRouter.route('/posaljiPonudu').post(
    (req, res) => new NabavkeController().posaljiPonudu(req, res)
)

nabavkeRouter.route('/dohvatiOtvorene').get(
    (req, res) => new NabavkeController().dohvatiOtvorene(req, res)
)

nabavkeRouter.route('/dohvatiNabavkeKlijenta/:kor_ime').get(
    (req, res) => new NabavkeController().dohvatiNabavkeKlijenta(req, res)
)

nabavkeRouter.route('/izvestaj/:id_nabavke').get(
    (req, res) => new NabavkeController().izvestaj(req, res)
)

export default nabavkeRouter;
