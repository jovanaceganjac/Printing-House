import * as express from 'express';
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import fs from 'fs'
import KorisnikModel from '../models/korisnik'
import ProizvodModel from '../models/proizvod'
import { NabavkeController } from './nabavke.controller'
import { adresaFrontenda, mailPodesen, posaljiLinkZaLozinku } from '../utils/mail'

const lozinkaRegex = /^(?=.*[A-Z])(?=.*[0-9])(?=.*[^A-Za-z0-9])[A-Za-z].{7,11}$/
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const korImeRegex = /^[A-Za-z0-9._-]{3,30}$/
const telefonRegex = /^\+?[0-9][0-9 /-]{5,18}[0-9]$/

const koordinate: any = {
    "Beograd": [44.8176, 20.4569], "Novi Sad": [45.2671, 19.8335],
    "Nis": [43.3209, 21.8958], "Kragujevac": [44.0128, 20.9114],
    "Subotica": [46.1005, 19.6651], "Cacak": [43.8914, 20.3497],
    "Zrenjanin": [45.3836, 20.3819], "Pancevo": [44.8708, 20.6403],
    "Kraljevo": [43.7258, 20.6892], "Leskovac": [42.9981, 21.9461]
}

export class KorisniciController {

    bezDijakritike = (tekst: any) => {
        return String(tekst).replace(/đ/g, 'dj').replace(/Đ/g, 'Dj')
            .normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
    }

    rezervneKoordinate = (grad: string) => {
        for (let kljuc in koordinate) {
            if (this.bezDijakritike(kljuc) == this.bezDijakritike(grad)) {
                return koordinate[kljuc]
            }
        }
        return [44.0165, 21.0059]
    }

    geokodiraj = (upit: string) => {
        return fetch('https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=rs&q=' + encodeURIComponent(upit), {
            headers: { 'User-Agent': 'PrintingHouse-PIA/1.0' },
            signal: AbortSignal.timeout(5000)
        }).then(odgovor => odgovor.json()).then((rezultat: any) => {
            if (Array.isArray(rezultat) && rezultat.length > 0) {
                return [Number(rezultat[0].lat), Number(rezultat[0].lon)]
            }
            return null
        }).catch(err => {
            console.log('Geokodiranje nije uspelo za "' + upit + '"')
            return null
        })
    }

    odrediKoordinate = (adresa: string, grad: string) => {
        return this.geokodiraj(adresa + ', ' + grad).then(tacka => {
            if (tacka != null) {
                return tacka
            }
            return this.geokodiraj(grad).then(tacka2 => tacka2 != null ? tacka2 : this.rezervneKoordinate(grad))
        })
    }

    dimenzijeSlike = (putanja: string) => {
        const b = fs.readFileSync(putanja)
        if (b.length > 24 && b[0] == 0x89 && b.toString('ascii', 1, 4) == 'PNG') {
            return { sirina: b.readUInt32BE(16), visina: b.readUInt32BE(20) }
        }
        if (b.length > 10 && b.toString('ascii', 0, 3) == 'GIF') {
            return { sirina: b.readUInt16LE(6), visina: b.readUInt16LE(8) }
        }
        if (b.length > 4 && b[0] == 0xFF && b[1] == 0xD8) {
            let i = 2
            while (i + 9 < b.length) {
                if (b[i] != 0xFF) {
                    i = i + 1
                    continue
                }
                const oznaka = b[i + 1]
                if (oznaka == 0xFF) {
                    i = i + 1
                    continue
                }
                if (oznaka == 0x01 || (oznaka >= 0xD0 && oznaka <= 0xD9)) {
                    i = i + 2
                    continue
                }
                if (oznaka >= 0xC0 && oznaka <= 0xCF && oznaka != 0xC4 && oznaka != 0xC8 && oznaka != 0xCC) {
                    return { sirina: b.readUInt16BE(i + 7), visina: b.readUInt16BE(i + 5) }
                }
                i = i + 2 + b.readUInt16BE(i + 2)
            }
        }
        return null
    }

    dohvatiSveKorisnike = (req: express.Request, res: express.Response) => {
        KorisnikModel.find({}).select('-lozinka -reset_token -reset_istek').then(korisnici => {
            res.json(korisnici)
        }).catch(err => {
            console.log(err)
            res.json([])
        })
    }

    brojStamparija = (req: express.Request, res: express.Response) => {
        KorisnikModel.countDocuments({ tip: 'stampar', status: 'odobren' }).then(broj => {
            res.json(broj)
        }).catch(err => {
            console.log(err)
            res.json(0)
        })
    }

    dohvatiNeodobrene = (req: express.Request, res: express.Response) => {
        KorisnikModel.find({ status: 'na cekanju' }).select('-lozinka -reset_token -reset_istek').then(korisnici => {
            res.json(korisnici)
        }).catch(err => {
            console.log(err)
            res.json([])
        })
    }

    odobriKorisnika = (req: express.Request, res: express.Response) => {
        let kor_ime = req.params.kor_ime

        KorisnikModel.updateOne({ kor_ime: kor_ime }, { status: 'odobren' }).then(() => {
            res.sendStatus(200)
        }).catch(err => {
            console.log(err)
            res.sendStatus(500)
        })
    }

    odbijKorisnika = (req: express.Request, res: express.Response) => {
        let kor_ime = req.params.kor_ime

        KorisnikModel.updateOne({ kor_ime: kor_ime }, { status: 'odbijen' }).then(() => {
            res.sendStatus(200)
        }).catch(err => {
            console.log(err)
            res.sendStatus(500)
        })
    }

    obrisiKorisnika = (req: express.Request, res: express.Response) => {
        let kor_ime = req.params.kor_ime

        KorisnikModel.findOne({ kor_ime: kor_ime }).then(korisnik => {
            if (korisnik == null) {
                res.sendStatus(500)
                return
            }
            if (korisnik.tip == 'admin') {
                res.sendStatus(500)
                return
            }
            if (korisnik.tip == 'stampar') {
                ProizvodModel.deleteMany({ stampar: kor_ime }).then(() => {
                    KorisnikModel.deleteOne({ kor_ime: kor_ime }).then(() => {
                        res.sendStatus(200)
                    }).catch(err => {
                        console.log(err)
                        res.sendStatus(500)
                    })
                }).catch(err => {
                    console.log(err)
                    res.sendStatus(500)
                })
                return
            }
            KorisnikModel.deleteOne({ kor_ime: kor_ime }).then(() => {
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

    dohvatiKorisnika = (req: express.Request, res: express.Response) => {
        let kor_ime = req.params.kor_ime

        KorisnikModel.findOne({ kor_ime: kor_ime }).select('-lozinka -reset_token -reset_istek').then(korisnik => {
            res.json(korisnik)
        }).catch(err => {
            console.log(err)
            res.json(null)
        })
    }

    azurirajKorisnika = (req: express.Request, res: express.Response) => {
        let korisnik = req.body
        let kor_ime = String(korisnik.kor_ime)
        let email = String(korisnik.email).trim().toLowerCase()
        let lozinka = korisnik.lozinka ? String(korisnik.lozinka) : ''
        let ime = korisnik.ime ? String(korisnik.ime).trim() : ''
        let prezime = korisnik.prezime ? String(korisnik.prezime).trim() : ''
        let telefon = korisnik.telefon ? String(korisnik.telefon).trim() : ''

        if (kor_ime == '' || ime == '' || prezime == '') {
            res.sendStatus(500)
            return
        }
        if (telefonRegex.test(telefon) == false) {
            res.sendStatus(500)
            return
        }
        if (emailRegex.test(email) == false) {
            res.sendStatus(500)
            return
        }
        if (lozinka != '' && lozinkaRegex.test(lozinka) == false) {
            res.sendStatus(500)
            return
        }

        KorisnikModel.findOne({ kor_ime: kor_ime }).then(postojeci => {
            if (postojeci == null) {
                res.sendStatus(500)
                return
            }
            KorisnikModel.findOne({ email: email, kor_ime: { $ne: kor_ime } }).then(zauzet => {
                if (zauzet != null) {
                    res.sendStatus(500)
                    return
                }
                let pravnoLice = (postojeci.tip == 'klijent_pravno' || postojeci.tip == 'stampar')
                let izmene: any = {
                    ime: ime,
                    prezime: prezime,
                    telefon: telefon,
                    email: email
                }
                if (korisnik.slika && String(korisnik.slika).startsWith('/uploads/profile/')) {
                    izmene.slika = String(korisnik.slika)
                }

                let adresa = korisnik.adresa_sedista ? String(korisnik.adresa_sedista).trim() : ''
                let grad = korisnik.grad ? String(korisnik.grad).trim() : ''
                let noveKoordinate: Promise<any> = Promise.resolve(null)
                if (pravnoLice == true) {
                    if (String(korisnik.naziv_institucije ?? '').trim() == '' || adresa == '' || grad == '') {
                        res.sendStatus(500)
                        return
                    }
                    izmene.naziv_institucije = String(korisnik.naziv_institucije).trim()
                    izmene.adresa_sedista = adresa
                    izmene.grad = grad
                    if (grad != postojeci.grad || adresa != postojeci.adresa_sedista) {
                        noveKoordinate = this.odrediKoordinate(adresa, grad)
                    }
                }

                noveKoordinate.then(tacka => {
                    if (tacka != null) {
                        izmene.lat = tacka[0]
                        izmene.lon = tacka[1]
                    }
                    const hes: Promise<any> = lozinka == '' ? Promise.resolve(null) : bcrypt.hash(lozinka, 10)
                    return hes.then(h => {
                        if (h != null) {
                            izmene.lozinka = h
                        }
                        return KorisnikModel.updateOne({ kor_ime: kor_ime }, izmene)
                    }).then(() => {
                        if (postojeci.tip == 'stampar' && grad != '' && grad != postojeci.grad) {
                            return ProizvodModel.updateMany({ stampar: kor_ime }, { grad: grad })
                        }
                        return null
                    }).then(() => {
                        res.sendStatus(200)
                    })
                }).catch(err => {
                    console.log(err)
                    res.sendStatus(500)
                })
            }).catch(err => {
                console.log(err)
                res.sendStatus(500)
            })
        }).catch(err => {
            console.log(err)
            res.sendStatus(500)
        })
    }

    prijava = (req: express.Request, res: express.Response) => {
        let kor_ime = String(req.body.kor_ime ?? '').trim()
        let lozinka = String(req.body.lozinka ?? '')

        if (kor_ime == '' || lozinka == '') {
            res.json(null)
            return
        }

        KorisnikModel.findOne({ kor_ime: kor_ime }).then(korisnik => {
            if (korisnik == null) {
                res.json(null)
                return
            }
            bcrypt.compare(String(lozinka), String(korisnik.lozinka)).then(ispravna => {
                if (ispravna == false) {
                    res.json(null)
                    return
                }
                if (korisnik.status != 'odobren') {
                    res.json({ status: korisnik.status })
                    return
                }
                const podaci = {
                    kor_ime: korisnik.kor_ime,
                    ime: korisnik.ime,
                    prezime: korisnik.prezime,
                    telefon: korisnik.telefon,
                    email: korisnik.email,
                    slika: korisnik.slika,
                    tip: korisnik.tip,
                    status: korisnik.status,
                    naziv_institucije: korisnik.naziv_institucije,
                    adresa_sedista: korisnik.adresa_sedista,
                    maticni_broj: korisnik.maticni_broj,
                    pib: korisnik.pib,
                    grad: korisnik.grad,
                    lat: korisnik.lat,
                    lon: korisnik.lon
                }
                if (korisnik.tip != 'klijent_pravno') {
                    res.json(podaci)
                    return
                }
                new NabavkeController().zakljuciIstekle(String(korisnik.kor_ime)).then(() => {
                    res.json(podaci)
                }).catch(err => {
                    console.log(err)
                    res.json(podaci)
                })
            }).catch(err => {
                console.log(err)
                res.json(null)
            })
        }).catch(err => {
            console.log(err)
            res.json(null)
        })
    }

    registracija = (req: express.Request, res: express.Response) => {
        let korisnik = req.body
        let tip = String(korisnik.tip)
        let kor_ime = String(korisnik.kor_ime ?? '').trim()
        let email = String(korisnik.email ?? '').trim().toLowerCase()
        let lozinka = String(korisnik.lozinka ?? '')
        let ime = String(korisnik.ime ?? '').trim()
        let prezime = String(korisnik.prezime ?? '').trim()
        let telefon = String(korisnik.telefon ?? '').trim()
        let naziv_institucije = String(korisnik.naziv_institucije ?? '').trim()
        let adresa = String(korisnik.adresa_sedista ?? '').trim()
        let grad = String(korisnik.grad ?? '').trim()
        let maticni_broj = String(korisnik.maticni_broj ?? '').trim()
        let pib = String(korisnik.pib ?? '').trim()
        let slika = korisnik.slika && String(korisnik.slika).startsWith('/uploads/profile/') ? String(korisnik.slika) : '/uploads/profile/default_profile_image.jpg'
        let pravnoLice = (tip == 'klijent_pravno' || tip == 'stampar')

        if (tip != 'klijent_fizicko' && tip != 'klijent_pravno' && tip != 'stampar') {
            res.sendStatus(500)
            return
        }
        if (korImeRegex.test(kor_ime) == false || ime == '' || prezime == '') {
            res.sendStatus(500)
            return
        }
        if (telefonRegex.test(telefon) == false) {
            res.sendStatus(500)
            return
        }
        if (lozinkaRegex.test(lozinka) == false) {
            res.sendStatus(500)
            return
        }
        if (emailRegex.test(email) == false) {
            res.sendStatus(500)
            return
        }
        if (pravnoLice == true) {
            if (/^[0-9]{8}$/.test(maticni_broj) == false) {
                res.sendStatus(500)
                return
            }
            if (/^[1-9][0-9]{8}$/.test(pib) == false) {
                res.sendStatus(500)
                return
            }
            if (naziv_institucije == '' || adresa == '' || grad == '') {
                res.sendStatus(500)
                return
            }
        }

        let uslovi: any[] = [
            { kor_ime: { $regex: '^' + kor_ime.replace(/\./g, '\\.') + '$', $options: 'i' } },
            { email: email }
        ]
        if (pravnoLice == true) {
            uslovi.push({ maticni_broj: maticni_broj })
            uslovi.push({ pib: pib })
        }

        KorisnikModel.findOne({ $or: uslovi }).then(postojeci => {
            if (postojeci != null) {
                res.sendStatus(500)
                return
            }
            const tacka: Promise<any> = pravnoLice ? this.odrediKoordinate(adresa, grad) : Promise.resolve([null, null])
            return tacka.then(koord => {
                return bcrypt.hash(lozinka, 10).then(hes => {
                    const novi = new KorisnikModel({
                        kor_ime: kor_ime,
                        lozinka: hes,
                        ime: ime,
                        prezime: prezime,
                        telefon: telefon,
                        email: email,
                        slika: slika,
                        tip: tip,
                        status: 'na cekanju',
                        naziv_institucije: pravnoLice ? naziv_institucije : '',
                        adresa_sedista: pravnoLice ? adresa : '',
                        maticni_broj: pravnoLice ? maticni_broj : '',
                        pib: pravnoLice ? pib : '',
                        grad: pravnoLice ? grad : '',
                        lat: koord[0],
                        lon: koord[1],
                        reset_token: '',
                        reset_istek: null
                    })
                    return novi.save()
                })
            }).then(() => {
                res.sendStatus(200)
            })
        }).catch(err => {
            console.log(err)
            res.sendStatus(500)
        })
    }

    zaboravljenaLozinka = (req: express.Request, res: express.Response) => {
        let kor_ime_ili_email = String(req.body.kor_ime_ili_email ?? '').trim()

        if (kor_ime_ili_email == '') {
            res.json(null)
            return
        }

        KorisnikModel.findOne({ $or: [{ kor_ime: kor_ime_ili_email }, { email: kor_ime_ili_email.toLowerCase() }] }).then(korisnik => {
            if (korisnik == null) {
                res.json(null)
                return
            }
            let token = crypto.randomBytes(24).toString('hex')
            let istek = new Date(Date.now() + 5 * 60 * 1000)
            KorisnikModel.updateOne({ kor_ime: korisnik.kor_ime }, { reset_token: token, reset_istek: istek }).then(() => {
                const link = adresaFrontenda() + '/nova-lozinka/' + token
                if (mailPodesen() == false) {
                    posaljiLinkZaLozinku(String(korisnik.email), link).catch(err => {
                        console.log(err)
                    })
                    res.json({ poslato: false, token: token })
                    return
                }
                posaljiLinkZaLozinku(String(korisnik.email), link).then(() => {
                    res.json({ poslato: true })
                }).catch(err => {
                    console.log(err)
                    res.json({ poslato: false, token: token })
                })
            }).catch(err => {
                console.log(err)
                res.json(null)
            })
        }).catch(err => {
            console.log(err)
            res.json(null)
        })
    }

    postaviNovuLozinku = (req: express.Request, res: express.Response) => {
        let token = String(req.body.token)
        let lozinka = String(req.body.lozinka)

        if (token == '') {
            res.sendStatus(500)
            return
        }
        if (lozinkaRegex.test(lozinka) == false) {
            res.sendStatus(500)
            return
        }

        KorisnikModel.findOne({ reset_token: token }).then(korisnik => {
            if (korisnik == null) {
                res.sendStatus(500)
                return
            }
            if (korisnik.reset_istek == null || korisnik.reset_istek < new Date()) {
                res.sendStatus(500)
                return
            }
            bcrypt.hash(lozinka, 10).then(hes => {
                KorisnikModel.updateOne({ kor_ime: korisnik.kor_ime }, { lozinka: hes, reset_token: '', reset_istek: null }).then(() => {
                    res.sendStatus(200)
                }).catch(err => {
                    console.log(err)
                    res.sendStatus(500)
                })
            }).catch(err => {
                console.log(err)
                res.sendStatus(500)
            })
        }).catch(err => {
            console.log(err)
            res.sendStatus(500)
        })
    }

    upload = (req: express.Request, res: express.Response) => {
        let datoteka = req.file

        if (datoteka == null) {
            res.json(null)
            return
        }
        const dimenzije = this.dimenzijeSlike(datoteka.path)
        if (dimenzije == null || dimenzije.sirina < 100 || dimenzije.sirina > 250 || dimenzije.visina < 100 || dimenzije.visina > 250) {
            fs.unlink(datoteka.path, err => {
                if (err) {
                    console.log(err)
                }
            })
            res.json(null)
            return
        }
        res.json({ putanja: '/uploads/profile/' + datoteka.filename })
    }

}
