import * as express from 'express';
import KategorijaModel from '../models/kategorija'
import ProizvodModel from '../models/proizvod'
import KorisnikModel from '../models/korisnik'

export class KategorijeController {

    dohvatiSveKategorije = (req: express.Request, res: express.Response) => {
        KategorijaModel.find({}).then(kategorije => {
            res.json(kategorije)
        }).catch(err => {
            console.log(err)
            res.json([])
        })
    }

    dohvatiAktivneKategorije = (req: express.Request, res: express.Response) => {
        KorisnikModel.find({ tip: 'stampar', status: 'odobren' }).lean().then(stampari => {
            let uslov: any = { kolicina_na_lageru: { $gt: 0 }, stampar: { $in: stampari.map(s => s.kor_ime) } }
            ProizvodModel.distinct('kategorija', uslov).then(kategorije => {
                res.json(kategorije)
            }).catch(err => {
                console.log(err)
                res.json([])
            })
        }).catch(err => {
            console.log(err)
            res.json([])
        })
    }

    dodajKategoriju = (req: express.Request, res: express.Response) => {
        let naziv = String(req.body.naziv).trim()

        if (naziv == '') {
            res.sendStatus(500)
            return
        }

        KategorijaModel.findOne({ naziv: naziv }).then(postojeca => {
            if (postojeca != null) {
                res.sendStatus(500)
                return
            }
            const nova = new KategorijaModel({ naziv: naziv, potkategorije: [] })
            nova.save().then(() => {
                res.sendStatus(200)
            }).catch(err => {
                console.log(err)
                res.sendStatus(500)
            })
        }).catch(err => {
            console.log(err)
            res.sendStatus(500)
        })
    }

    dodajPotkategoriju = (req: express.Request, res: express.Response) => {
        let naziv = String(req.body.naziv).trim()
        let potkategorija = String(req.body.potkategorija).trim()

        if (naziv == '' || potkategorija == '') {
            res.sendStatus(500)
            return
        }

        KategorijaModel.findOne({ naziv: naziv }).then(kategorija => {
            if (kategorija == null) {
                res.sendStatus(500)
                return
            }
            if (kategorija.potkategorije.indexOf(potkategorija) >= 0) {
                res.sendStatus(500)
                return
            }
            KategorijaModel.updateOne({ naziv: naziv }, { $push: { potkategorije: potkategorija } }).then(() => {
                res.sendStatus(200)
            }).catch(err => {
                console.log(err)
                res.sendStatus(500)
            })
        }).catch(err => {
            console.log(err)
            res.sendStatus(500)
        })
    }

}
