import * as express from 'express';
import FakturaModel from '../models/faktura'
import ProizvodModel from '../models/proizvod'
import KorisnikModel from '../models/korisnik'
import { napraviPdf, opisKupca } from '../utils/pdf'
import { posaljiFakturu } from '../utils/mail'

export class FaktureController {

    luhn = (broj: string) => {
        let zbir = 0
        let parna = false
        for (let i = broj.length - 1; i >= 0; i--) {
            let cifra = Number(broj.charAt(i))
            if (parna == true) {
                cifra = cifra * 2
                if (cifra > 9) {
                    cifra = cifra - 9
                }
            }
            zbir = zbir + cifra
            parna = !parna
        }
        return zbir % 10 == 0
    }

    proveriKarticu = (kartica: any) => {
        if (kartica == null) {
            return false
        }
        if (String(kartica.tip).trim() == '') {
            return false
        }

        const broj = String(kartica.broj).replace(/\s/g, '')
        if (/^[0-9]{13,19}$/.test(broj) == false) {
            return false
        }
        if (this.luhn(broj) == false) {
            return false
        }
        if (/^[0-9]{3,4}$/.test(String(kartica.cvc)) == false) {
            return false
        }

        const datum = String(kartica.datum)
        if (/^(0[1-9]|1[0-2])\/[0-9]{2}$/.test(datum) == false) {
            return false
        }

        const mesec = Number(datum.substring(0, 2))
        const godina = 2000 + Number(datum.substring(3, 5))
        const istek = new Date(godina, mesec, 1)
        if (istek <= new Date()) {
            return false
        }

        const tip = String(kartica.tip)
        if (tip == 'Visa' && broj.charAt(0) != '4') {
            return false
        }
        if (tip == 'MasterCard' && /^(5[1-5]|2[2-7])/.test(broj) == false) {
            return false
        }

        return true
    }

    testniNacinPlacanja = (broj: string) => {
        const kartice: any = {
            '4242424242424242': 'pm_card_visa',
            '4000056655665556': 'pm_card_visa_debit',
            '5555555555554444': 'pm_card_mastercard',
            '2223003122003222': 'pm_card_mastercard',
            '4000000000000002': 'pm_card_chargeDeclined',
            '4000000000009995': 'pm_card_chargeDeclinedInsufficientFunds'
        }
        return kartice[broj] ? kartice[broj] : ''
    }

    naplati = (kartica: any, iznos: number, opis: string) => {
        const broj = String(kartica.broj).replace(/\s/g, '')
        const nacin = this.testniNacinPlacanja(broj)
        const kljuc = process.env.STRIPE_SECRET_KEY

        if (!kljuc) {
            return Promise.resolve(nacin == 'pm_card_visa' || nacin == 'pm_card_visa_debit' || nacin == 'pm_card_mastercard')
        }
        if (nacin == '') {
            return Promise.resolve(false)
        }

        const parametri = new URLSearchParams()
        parametri.append('amount', String(Math.round(iznos * 100)))
        parametri.append('currency', 'rsd')
        parametri.append('payment_method', nacin)
        parametri.append('confirm', 'true')
        parametri.append('description', opis)
        parametri.append('automatic_payment_methods[enabled]', 'true')
        parametri.append('automatic_payment_methods[allow_redirects]', 'never')

        return fetch('https://api.stripe.com/v1/payment_intents', {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + kljuc,
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: parametri.toString()
        }).then(odgovor => odgovor.json()).then((uplata: any) => {
            if (uplata.status == 'succeeded') {
                console.log('Stripe uplata ' + uplata.id + ' uspesna')
                return true
            }
            console.log('Stripe uplata odbijena: ' + (uplata.error ? uplata.error.message : uplata.status))
            return false
        })
    }

    dodajNazivStamparije = (fakture: any[], stampari: any[]) => {
        return fakture.map(faktura => {
            const stampar = stampari.find(s => s.kor_ime == faktura.stampar)
            if (stampar != null && stampar.naziv_institucije != null && stampar.naziv_institucije != '') {
                faktura.naziv_stamparije = stampar.naziv_institucije
            }
            else {
                faktura.naziv_stamparije = faktura.stampar
            }
            return faktura
        })
    }

    dohvatiFaktureKlijenta = (req: express.Request, res: express.Response) => {
        let kor_ime = req.params.kor_ime

        FakturaModel.find({ klijent: kor_ime }).sort({ datum: -1 }).lean().then(fakture => {
            KorisnikModel.find({ tip: 'stampar' }).lean().then(stampari => {
                res.json(this.dodajNazivStamparije(fakture, stampari))
            }).catch(err => {
                console.log(err)
                res.json([])
            })
        }).catch(err => {
            console.log(err)
            res.json([])
        })
    }

    dohvatiFaktureStampara = (req: express.Request, res: express.Response) => {
        let kor_ime = req.params.kor_ime

        FakturaModel.find({ stampar: kor_ime }).sort({ datum: -1 }).lean().then(fakture => {
            KorisnikModel.find({ tip: 'stampar' }).lean().then(stampari => {
                res.json(this.dodajNazivStamparije(fakture, stampari))
            }).catch(err => {
                console.log(err)
                res.json([])
            })
        }).catch(err => {
            console.log(err)
            res.json([])
        })
    }

    posaljiFakture = (fakture: any[], stampari: any[], korisnik: any) => {
        for (let i = 0; i < fakture.length; i++) {
            const faktura = fakture[i]
            const stampar = stampari.find(s => s.kor_ime == faktura.stampar)
            const naziv_stamparije = (stampar != null && stampar.naziv_institucije != null && stampar.naziv_institucije != '') ? stampar.naziv_institucije : faktura.stampar

            napraviPdf(faktura, naziv_stamparije, opisKupca(korisnik)).then(putanja => {
                return posaljiFakturu(String(korisnik.email), faktura.id_fakture, putanja)
            }).catch(err => {
                console.log('Faktura ' + faktura.id_fakture + ': PDF ili slanje nije uspelo')
                console.log(err)
            })
        }
    }

    preuzmiPdf = (req: express.Request, res: express.Response) => {
        let id_fakture = Number(req.params.id_fakture)

        if (isNaN(id_fakture)) {
            res.sendStatus(500)
            return
        }

        FakturaModel.findOne({ id_fakture: id_fakture }).lean().then(faktura => {
            if (faktura == null) {
                res.sendStatus(500)
                return
            }
            KorisnikModel.find({ kor_ime: { $in: [String(faktura.stampar), String(faktura.klijent)] } }).lean().then(korisnici => {
                const stampar = korisnici.find(k => k.kor_ime == faktura.stampar)
                const klijent = korisnici.find(k => k.kor_ime == faktura.klijent)
                const naziv_stamparije = (stampar != null && stampar.naziv_institucije != null && stampar.naziv_institucije != '') ? stampar.naziv_institucije : faktura.stampar
                napraviPdf(faktura, String(naziv_stamparije), opisKupca(klijent)).then(novaPutanja => {
                    res.sendFile(novaPutanja)
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

    statistikaPromet = (req: express.Request, res: express.Response) => {
        const granica = new Date()
        granica.setMonth(granica.getMonth() - 3)

        FakturaModel.find({ datum: { $gte: granica } }).lean().then(faktureIzBaze => {
            const fakture: any[] = faktureIzBaze

            KorisnikModel.find({ tip: 'stampar' }).lean().then(stampariIzBaze => {
                const stampari: any[] = stampariIzBaze
                let grupe: any[] = []

                for (let i = 0; i < fakture.length; i++) {
                    let grupa = grupe.find(g => g.stampar == fakture[i].stampar)
                    if (grupa == null) {
                        const stampar = stampari.find(s => s.kor_ime == fakture[i].stampar)
                        grupa = {
                            stampar: fakture[i].stampar,
                            naziv_stamparije: (stampar != null && stampar.naziv_institucije != null && stampar.naziv_institucije != '') ? stampar.naziv_institucije : fakture[i].stampar,
                            iznos: 0
                        }
                        grupe.push(grupa)
                    }
                    grupa.iznos = grupa.iznos + Number(fakture[i].ukupan_iznos)
                }

                grupe.sort((a, b) => b.iznos - a.iznos)
                res.json(grupe)
            }).catch(err => {
                console.log(err)
                res.json([])
            })
        }).catch(err => {
            console.log(err)
            res.json([])
        })
    }

    statistikaNaruceni = (req: express.Request, res: express.Response) => {
        const granica = new Date()
        granica.setMonth(granica.getMonth() - 1)

        FakturaModel.find({ datum: { $gte: granica } }).lean().then(faktureIzBaze => {
            const fakture: any[] = faktureIzBaze
            let redovi: any[] = []
            let ukupno = 0

            for (let i = 0; i < fakture.length; i++) {
                for (let j = 0; j < fakture[i].stavke.length; j++) {
                    const stavka = fakture[i].stavke[j]
                    let red = redovi.find(r => r.sifra == stavka.sifra)
                    if (red == null) {
                        red = { sifra: stavka.sifra, naziv: stavka.naziv, kolicina: 0, procenat: 0 }
                        redovi.push(red)
                    }
                    red.kolicina = red.kolicina + Number(stavka.kolicina)
                    ukupno = ukupno + Number(stavka.kolicina)
                }
            }

            for (let i = 0; i < redovi.length; i++) {
                if (ukupno > 0) {
                    redovi[i].procenat = Math.round((redovi[i].kolicina / ukupno) * 1000) / 10
                }
            }

            redovi.sort((a, b) => b.kolicina - a.kolicina)
            res.json(redovi)
        }).catch(err => {
            console.log(err)
            res.json([])
        })
    }

    statistikaOcene = (req: express.Request, res: express.Response) => {
        ProizvodModel.find({ 'ocene.0': { $exists: true } }).lean().then(proizvodiIzBaze => {
            const proizvodi: any[] = proizvodiIzBaze
            const sada = new Date()

            let meseci: string[] = []
            for (let i = 5; i >= 0; i--) {
                const mesec = new Date(sada.getFullYear(), sada.getMonth() - i, 1)
                meseci.push(mesec.getFullYear() + '-' + String(mesec.getMonth() + 1).padStart(2, '0'))
            }

            let rezultat = proizvodi.map(proizvod => {
                let tacke: any[] = []
                let prethodni = 0

                for (let i = 0; i < meseci.length; i++) {
                    const kraj = new Date(sada.getFullYear(), sada.getMonth() - (5 - i) + 1, 1)
                    let zbir = 0
                    let broj = 0

                    for (let j = 0; j < proizvod.ocene.length; j++) {
                        if (new Date(proizvod.ocene[j].datum) < kraj) {
                            zbir = zbir + Number(proizvod.ocene[j].vrednost)
                            broj = broj + 1
                        }
                    }

                    let prosek = prethodni
                    if (broj > 0) {
                        prosek = Math.round((zbir / broj) * 100) / 100
                    }
                    prethodni = prosek
                    tacke.push({ mesec: meseci[i], prosek: prosek })
                }

                return { sifra: proizvod.sifra, naziv: proizvod.naziv, broj_ocena: proizvod.ocene.length, tacke: tacke }
            })

            rezultat.sort((a, b) => b.broj_ocena - a.broj_ocena)
            res.json(rezultat)
        }).catch(err => {
            console.log(err)
            res.json([])
        })
    }

    mojaOcena = (proizvod: any, kor_ime: string) => {
        if (proizvod == null || proizvod.ocene == null) {
            return 0
        }
        const ocena = proizvod.ocene.find((o: any) => o.kor_ime == kor_ime)
        return ocena == null ? 0 : Number(ocena.vrednost)
    }

    dohvatiArhivu = (req: express.Request, res: express.Response) => {
        let kor_ime = req.params.kor_ime

        FakturaModel.find({ klijent: kor_ime, status: { $in: ['isporuceno', 'primljeno'] } }).sort({ datum: -1 }).lean().then(faktureIzBaze => {
            const fakture: any[] = faktureIzBaze

            KorisnikModel.find({ tip: 'stampar' }).lean().then(stampariIzBaze => {
                const stampari: any[] = stampariIzBaze

                ProizvodModel.find({}).lean().then(proizvodiIzBaze => {
                    const proizvodi: any[] = proizvodiIzBaze
                    let redovi: any[] = []

                    for (let i = 0; i < fakture.length; i++) {
                        const stampar = stampari.find(s => s.kor_ime == fakture[i].stampar)
                        for (let j = 0; j < fakture[i].stavke.length; j++) {
                            const stavka = fakture[i].stavke[j]
                            const proizvod = proizvodi.find(p => p.sifra == stavka.sifra)
                            redovi.push({
                                id_fakture: fakture[i].id_fakture,
                                id_stavke: stavka.id_stavke,
                                datum: fakture[i].datum,
                                status: fakture[i].status,
                                sifra: stavka.sifra,
                                naziv: stavka.naziv,
                                kolicina: stavka.kolicina,
                                stampar: fakture[i].stampar,
                                naziv_stamparije: (stampar != null && stampar.naziv_institucije != null && stampar.naziv_institucije != '') ? stampar.naziv_institucije : fakture[i].stampar,
                                slika: proizvod == null ? '' : proizvod.slika,
                                moja_ocena: this.mojaOcena(proizvod, String(kor_ime))
                            })
                        }
                    }

                    res.json(redovi)
                }).catch(err => {
                    console.log(err)
                    res.json([])
                })
            }).catch(err => {
                console.log(err)
                res.json([])
            })
        }).catch(err => {
            console.log(err)
            res.json([])
        })
    }

    napraviFakture = (req: express.Request, res: express.Response) => {
        let klijent = String(req.body.klijent)
        let stavke = Array.isArray(req.body.stavke) ? req.body.stavke : []
        let statusNovih = 'naruceno'

        if (klijent == '' || stavke.length == 0) {
            res.sendStatus(500)
            return
        }

        KorisnikModel.findOne({ kor_ime: klijent, tip: 'klijent_fizicko', status: 'odobren' }).then(korisnik => {
            if (korisnik == null) {
                res.sendStatus(500)
                return
            }

            ProizvodModel.find({}).lean().then(proizvodiIzBaze => {
                const proizvodi: any[] = proizvodiIzBaze
                let trazeno: any = {}
                let ispravno = true

                for (let i = 0; i < stavke.length; i++) {
                    let sifra = String(stavke[i].sifra)
                    let tip_stampe = String(stavke[i].tip_stampe)
                    let kolicina = Number(stavke[i].kolicina)
                    if (isNaN(kolicina) || kolicina <= 0 || Number.isInteger(kolicina) == false) {
                        ispravno = false
                    }
                    const proizvod = proizvodi.find(p => p.sifra == sifra)
                    if (proizvod == null) {
                        ispravno = false
                    }
                    else {
                        if (tip_stampe == '') {
                            ispravno = false
                        }
                        if (proizvod.usluge_stampe.find((u: any) => u.tip_stampe == tip_stampe) == null) {
                            ispravno = false
                        }
                        const boja = String(stavke[i].boja)
                        if (proizvod.dostupne_boje.length > 0) {
                            if (proizvod.dostupne_boje.indexOf(boja) < 0) {
                                ispravno = false
                            }
                        }
                        else {
                            if (boja != 'Bela') {
                                ispravno = false
                            }
                        }
                    }
                    if (trazeno[sifra] == null) {
                        trazeno[sifra] = 0
                    }
                    trazeno[sifra] = trazeno[sifra] + kolicina
                }

                for (let sifra in trazeno) {
                    const proizvod = proizvodi.find(p => p.sifra == sifra)
                    if (proizvod == null || Number(proizvod.kolicina_na_lageru) < trazeno[sifra]) {
                        ispravno = false
                    }
                }

                if (ispravno == false) {
                    res.sendStatus(500)
                    return
                }

                KorisnikModel.find({ tip: 'stampar' }).lean().then(stampariIzBaze => {
                    const stampari: any[] = stampariIzBaze

                    FakturaModel.findOne({}).sort({ id_fakture: -1 }).then(poslednja => {
                        const prviId = Number(poslednja?.id_fakture ?? 0) + 1

                        let grupe: any[] = []
                        for (let i = 0; i < stavke.length; i++) {
                            const proizvod = proizvodi.find(p => p.sifra == String(stavke[i].sifra))
                            const usluga = proizvod.usluge_stampe.find((u: any) => u.tip_stampe == stavke[i].tip_stampe)
                            const cena_po_komadu = Number(proizvod.jedinicna_cena) + (usluga == null ? 0 : Number(usluga.dodatna_cena_po_komadu))
                            const kolicina = Number(stavke[i].kolicina)

                            let grupa = grupe.find(g => g.stampar == proizvod.stampar)
                            if (grupa == null) {
                                const stampar = stampari.find(s => s.kor_ime == proizvod.stampar)
                                grupa = {
                                    stampar: proizvod.stampar,
                                    grad: stampar == null ? proizvod.grad : stampar.grad,
                                    stavke: []
                                }
                                grupe.push(grupa)
                            }
                            grupa.stavke.push({
                                id_stavke: grupa.stavke.length + 1,
                                sifra: proizvod.sifra,
                                naziv: proizvod.naziv,
                                kolicina: kolicina,
                                boja: stavke[i].boja,
                                tip_stampe: stavke[i].tip_stampe,
                                cena_po_komadu: cena_po_komadu,
                                ukupno: cena_po_komadu * kolicina,
                                tekst_stampe: stavke[i].tekst_stampe,
                                slika_stampe: stavke[i].slika_stampe
                            })
                        }

                        const noveFakture = grupe.map((grupa, i) => {
                            let ukupan_iznos = 0
                            for (let j = 0; j < grupa.stavke.length; j++) {
                                ukupan_iznos = ukupan_iznos + grupa.stavke[j].ukupno
                            }
                            return {
                                id_fakture: prviId + i,
                                klijent: klijent,
                                stampar: grupa.stampar,
                                grad: grupa.grad,
                                datum: new Date(),
                                status: statusNovih,
                                ukupan_iznos: ukupan_iznos,
                                stavke: grupa.stavke
                            }
                        })

                        FakturaModel.insertMany(noveFakture).then(() => {
                            Promise.all(Object.keys(trazeno).map(sifra => {
                                return ProizvodModel.updateOne(
                                    { sifra: sifra },
                                    { $inc: { kolicina_na_lageru: -trazeno[sifra] } }
                                )
                            })).then(() => {
                                res.json(noveFakture.map(f => f.id_fakture))
                                try {
                                    this.posaljiFakture(noveFakture, stampari, korisnik)
                                }
                                catch (greska) {
                                    console.log(greska)
                                }
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

    platiFakture = (req: express.Request, res: express.Response) => {
        let klijent = String(req.body.klijent)
        let idjevi = Array.isArray(req.body.fakture) ? req.body.fakture.map((id: any) => Number(id)) : []
        let kartica = req.body.kartica ? req.body.kartica : null

        if (klijent == '' || idjevi.length == 0 || idjevi.some((id: number) => isNaN(id))) {
            res.sendStatus(500)
            return
        }
        if (this.proveriKarticu(kartica) == false) {
            res.sendStatus(500)
            return
        }

        FakturaModel.find({ id_fakture: { $in: idjevi }, klijent: klijent }).then(fakture => {
            if (fakture.length != idjevi.length || fakture.some(f => f.status != 'naruceno')) {
                res.sendStatus(500)
                return
            }

            let iznos = 0
            for (let i = 0; i < fakture.length; i++) {
                iznos = iznos + Number(fakture[i].ukupan_iznos)
            }

            this.naplati(kartica, iznos, 'Printing House - fakture ' + idjevi.join(', ')).then(uspesno => {
                if (uspesno == false) {
                    res.sendStatus(500)
                    return
                }
                FakturaModel.updateMany({ id_fakture: { $in: idjevi }, klijent: klijent, status: 'naruceno' }, { status: 'placeno' }).then(() => {
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

    promeniStatus = (req: express.Request, res: express.Response) => {
        let id_fakture = Number(req.body.id_fakture)
        let status = String(req.body.status)
        let kor_ime = String(req.body.kor_ime)

        if (isNaN(id_fakture) || kor_ime == '') {
            res.sendStatus(500)
            return
        }

        FakturaModel.findOne({ id_fakture: id_fakture }).then(faktura => {
            if (faktura == null) {
                res.sendStatus(500)
                return
            }

            let dozvoljeno = false
            if (faktura.status == 'placeno' && status == 'u stampi' && faktura.stampar == kor_ime) {
                dozvoljeno = true
            }
            if (faktura.status == 'u stampi' && status == 'isporuceno' && faktura.stampar == kor_ime) {
                dozvoljeno = true
            }
            if (faktura.status == 'isporuceno' && status == 'primljeno' && faktura.klijent == kor_ime) {
                dozvoljeno = true
            }

            if (dozvoljeno == false) {
                res.sendStatus(500)
                return
            }

            FakturaModel.updateOne({ id_fakture: id_fakture }, { status: status }).then(() => {
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

    otkaziFakturu = (req: express.Request, res: express.Response) => {
        let id_fakture = Number(req.params.id_fakture)
        let kor_ime = String(req.body.kor_ime)

        if (isNaN(id_fakture) || kor_ime == '') {
            res.sendStatus(500)
            return
        }

        FakturaModel.findOne({ id_fakture: id_fakture }).then(faktura => {
            if (faktura == null) {
                res.sendStatus(500)
                return
            }
            if (faktura.status != 'naruceno' || faktura.klijent != kor_ime) {
                res.sendStatus(500)
                return
            }

            Promise.all(faktura.stavke.map(stavka => {
                return ProizvodModel.updateOne(
                    { sifra: stavka.sifra },
                    { $inc: { kolicina_na_lageru: Number(stavka.kolicina) } }
                )
            })).then(() => {
                FakturaModel.deleteOne({ id_fakture: id_fakture }).then(() => {
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

}
