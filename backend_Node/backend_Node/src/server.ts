import express, { Router } from 'express';
import cors from 'cors'
import mongoose from 'mongoose';
import path from 'path';
import korisniciRouter from './routes/korisnici.routes';
import kategorijeRouter from './routes/kategorije.routes';
import proizvodiRouter from './routes/proizvodi.routes';
import faktureRouter from './routes/fakture.routes';
import nabavkeRouter from './routes/nabavke.routes';
const app = express();
app.use(cors());
app.use(express.json());

mongoose.connect("mongodb://127.0.0.1:27017/printing_house")
const connection = mongoose.connection;
connection.once('open', () => {
    console.log("MongoDB connected")
})

app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')))

const router = Router()
router.use('/korisnici', korisniciRouter)
router.use('/kategorije', kategorijeRouter)
router.use('/proizvodi', proizvodiRouter)
router.use('/fakture', faktureRouter)
router.use('/nabavke', nabavkeRouter)

app.use('/', router)

app.listen(4000, () => console.log(`Express server running on port 4000`));
