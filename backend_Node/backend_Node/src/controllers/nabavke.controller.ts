import * as express from 'express';
import JavnaNabavkaModel from '../models/javnaNabavka'
import ProizvodModel from '../models/proizvod'
import KorisnikModel from '../models/korisnik'
import FakturaModel from '../models/faktura'
import { napraviIzvestaj, napraviPdf, opisKupca } from '../utils/pdf'
import { posaljiObavestenje, posaljiFakturu } from '../utils/mail'

const trajanjeLicitacije = 10 * 60 * 1000

export class NabavkeController {

    bezDijakritike = (tekst: any) => {
        return String(tekst).replace(/đ/g, 'dj').replace(/Đ/g, 'Dj')
            .normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
    }

    nadjiKodStampara = (proizvodi: any[], stampar: string, naziv: string) => {
        return proizvodi.find(p => p.stampar == stampar && this.bezDijakritike(p.naziv) == this.bezDijakritike(naziv))
    }

    izabraniProizvod = (proizvodi: any[], ponuda: any, trazena: any) => {
        const stavkaPonude = ponuda.stavke.find((s: any) => s.sifra == trazena.sifra)
        if (stavkaPonude != null && stavkaPonude.sifra_proizvoda) {
            return proizvodi.find(p => p.sifra == stavkaPonude.sifra_proizvoda && p.stampar == ponuda.stampar)
        }
        const istaSifra = proizvodi.find(p => p.sifra == trazena.sifra && p.stampar == ponuda.stampar)
        if (istaSifra != null) {
            return istaSifra
        }
        return this.nadjiKodStampara(proizvodi, ponuda.stampar, trazena.naziv)
    }

    jeIstekla = (nabavka: any) => {
        return (Date.now() - new Date(nabavka.datum).getTime()) > trajanjeLicitacije
    }

    nazivKorisnika = (korisnik: any) => {
        if (korisnik != null && korisnik.naziv_institucije != null && korisnik.naziv_institucije != '') {
            return korisnik.naziv_institucije
        }
        if (korisnik != null) {
            return korisnik.kor_ime
        }
        return ''
    }

    raspisiNabavku = (req: express.Request, res: express.Response) => {
        let klijent = String(req.body.klijent)
        let stavke = Array.isArray(req.body.stavke) ? req.body.stavke : []

        if (klijent == '' || stavke.length == 0) {
            res.sendStatus(500)
            return
        }

        KorisnikModel.findOne({ kor_ime: klijent, tip: 'klijent_pravno', status: 'odobren' }).then(korisnik => {
            if (korisnik == null) {
                res.sendStatus(500)
                return
            }

            ProizvodModel.find({}).lean().then(proizvodiIzBaze => {
                const proizvodi: any[] = proizvodiIzBaze
                let trazeno: any[] = []
                let ispravno = true

                for (let i = 0; i < stavke.length; i++) {
                    const sifra = String(stavke[i].sifra)
                    const kolicina = Number(stavke[i].kolicina)
                    const proizvod = proizvodi.find(p => p.sifra == sifra)

                    if (proizvod == null || isNaN(kolicina) || kolicina <= 0 || Number.isInteger(kolicina) == false) {
                        ispravno = false
                        continue
                    }

                    let red = trazeno.find(t => t.sifra == sifra)
                    if (red == null) {
                        red = { sifra: proizvod.sifra, naziv: proizvod.naziv, potkategorija: proizvod.potkategorija, kolicina: 0 }
                        trazeno.push(red)
                    }
                    red.kolicina = red.kolicina + kolicina
                }

                if (ispravno == false || trazeno.length == 0) {
                    res.sendStatus(500)
                    return
                }

                JavnaNabavkaModel.findOne({}).sort({ id_nabavke: -1 }).then(poslednja => {
                    const noviId = Number(poslednja?.id_nabavke ?? 0) + 1

                    const nova = new JavnaNabavkaModel({
                        id_nabavke: noviId,
                        klijent: klijent,
                        datum: new Date(),
                        status: 'otvorena',
                        stavke: trazeno,
                        ponude: [],
                        pobednik: ''
                    })

                    nova.save().then(() => {
                        res.sendStatus(200)
                        try {
                            this.obavestiStampare(noviId, trazeno, this.nazivKorisnika(korisnik))
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
    }

    obavestiStampare = (id_nabavke: number, stavke: any[], naziv_narucioca: string) => {
        KorisnikModel.find({ tip: 'stampar', status: 'odobren' }).lean().then(stampariIzBaze => {
            const stampari: any[] = stampariIzBaze
            const spisak = stavke.map((s, i) => (i + 1) + '. ' + s.naziv + ' (' + s.potkategorija + ') - ' + s.kolicina + ' kom').join('\n')
            const tekst = 'Postovani,\n\notvorena je licitacija za javnu nabavku br. ' + id_nabavke +
                ', narucilac: ' + naziv_narucioca + '.\n\nPotrebni proizvodi:\n' + spisak +
                '\n\nLicitacija traje 10 minuta od trenutka raspisivanja. Ponudu mozete poslati u odeljku LICITACIJE.\n\nPrinting House'

            for (let i = 0; i < stampari.length; i++) {
                posaljiObavestenje(String(stampari[i].email), 'Otvorena licitacija - javna nabavka br. ' + id_nabavke, tekst)
                    .catch(err => {
                        console.log(err)
                    })
            }
        }).catch(err => {
            console.log(err)
        })
    }

    dohvatiOtvorene = (req: express.Request, res: express.Response) => {
        JavnaNabavkaModel.find({ status: 'otvorena' }).sort({ datum: -1 }).lean().then(nabavkeIzBaze => {
            const nabavke: any[] = nabavkeIzBaze

            KorisnikModel.find({}).lean().then(korisniciIzBaze => {
                const korisnici: any[] = korisniciIzBaze
                let aktivne: any[] = []

                for (let i = 0; i < nabavke.length; i++) {
                    if (this.jeIstekla(nabavke[i]) == true) {
                        continue
                    }
                    const klijent = korisnici.find(k => k.kor_ime == nabavke[i].klijent)
                    nabavke[i].naziv_institucije = this.nazivKorisnika(klijent)
                    nabavke[i].istice = new Date(new Date(nabavke[i].datum).getTime() + trajanjeLicitacije)
                    aktivne.push(nabavke[i])
                }

                res.json(aktivne)
            }).catch(err => {
                console.log(err)
                res.json([])
            })
        }).catch(err => {
            console.log(err)
            res.json([])
        })
    }

    posaljiPonudu = (req: express.Request, res: express.Response) => {
        let id_nabavke = Number(req.body.id_nabavke)
        let stampar = String(req.body.stampar)
        let stavke = Array.isArray(req.body.stavke) ? req.body.stavke : []

        if (isNaN(id_nabavke) || stampar == '' || stavke.length == 0) {
            res.sendStatus(500)
            return
        }

        KorisnikModel.findOne({ kor_ime: stampar, tip: 'stampar', status: 'odobren' }).then(korisnik => {
            if (korisnik == null) {
                res.sendStatus(500)
                return
            }
            JavnaNabavkaModel.findOne({ id_nabavke: id_nabavke }).then(nabavka => {
                if (nabavka == null || nabavka.status != 'otvorena' || this.jeIstekla(nabavka) == true) {
                    res.sendStatus(500)
                    return
                }
                if (nabavka.ponude.find(p => p.stampar == stampar) != null) {
                    res.sendStatus(500)
                    return
                }

                ProizvodModel.find({}).lean().then(proizvodiIzBaze => {
                    const proizvodi: any[] = proizvodiIzBaze
                    let ukupna_cena = 0
                    let ispravno = true
                    let stavkePonude: any[] = []

                    for (let i = 0; i < nabavka.stavke.length; i++) {
                        const trazena = nabavka.stavke[i]
                        const ponudjena = stavke.find((s: any) => String(s.sifra) == String(trazena.sifra))

                        if (ponudjena == null) {
                            ispravno = false
                            continue
                        }

                        const cena = Number(ponudjena.cena_po_komadu)
                        if (isNaN(cena) || cena <= 0) {
                            ispravno = false
                            continue
                        }

                        const trazeniProizvod = proizvodi.find(p => p.sifra == trazena.sifra)
                        const potkategorija = trazena.potkategorija ? trazena.potkategorija : (trazeniProizvod != null ? trazeniProizvod.potkategorija : '')
                        const svoj = proizvodi.find(p => p.sifra == String(ponudjena.sifra_proizvoda) && p.stampar == stampar)
                        if (svoj == null || svoj.potkategorija != potkategorija) {
                            ispravno = false
                            continue
                        }

                        ukupna_cena = ukupna_cena + cena * Number(trazena.kolicina)
                        stavkePonude.push({ sifra: trazena.sifra, sifra_proizvoda: svoj.sifra, naziv_proizvoda: svoj.naziv, cena_po_komadu: cena })
                    }

                    if (ispravno == false) {
                        res.sendStatus(500)
                        return
                    }

                    let najveci = 0
                    for (let i = 0; i < nabavka.ponude.length; i++) {
                        if (Number(nabavka.ponude[i].id_ponude) > najveci) {
                            najveci = Number(nabavka.ponude[i].id_ponude)
                        }
                    }

                    JavnaNabavkaModel.updateOne(
                        { id_nabavke: id_nabavke },
                        {
                            $push: {
                                ponude: {
                                    id_ponude: najveci + 1,
                                    stampar: stampar,
                                    ukupna_cena: ukupna_cena,
                                    datum: new Date(),
                                    stavke: stavkePonude
                                }
                            }
                        }
                    ).then(() => {
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
        }).catch(err => {
            console.log(err)
            res.sendStatus(500)
        })
    }

    imaDovoljno = (proizvodi: any[], ponuda: any, nabavka: any) => {
        let potrebno: any = {}
        for (let j = 0; j < nabavka.stavke.length; j++) {
            const trazena = nabavka.stavke[j]
            const proizvod = this.izabraniProizvod(proizvodi, ponuda, trazena)
            if (proizvod == null) {
                return false
            }
            potrebno[proizvod.sifra] = (potrebno[proizvod.sifra] ? potrebno[proizvod.sifra] : 0) + Number(trazena.kolicina)
        }
        for (let sifra in potrebno) {
            const proizvod = proizvodi.find(p => p.sifra == sifra)
            if (proizvod == null || Number(proizvod.kolicina_na_lageru) < potrebno[sifra]) {
                return false
            }
        }
        return true
    }

    obavestiOIshodu = (nabavka: any, faktura: any, stampari: any[]) => {
        const pobednik = stampari.find(s => s.kor_ime == faktura.stampar)
        const nazivPobednika = this.nazivKorisnika(pobednik)

        KorisnikModel.findOne({ kor_ime: nabavka.klijent }).lean().then(klijent => {
            if (klijent == null) {
                return null
            }
            return napraviPdf(faktura, nazivPobednika, opisKupca(klijent)).then(putanja => posaljiFakturu(String(klijent.email), faktura.id_fakture, putanja))
        }).catch(err => {
            console.log('Faktura ' + faktura.id_fakture + ' za nabavku: PDF ili slanje nije uspelo')
            console.log(err)
        })

        for (let i = 0; i < nabavka.ponude.length; i++) {
            const ponudjac = stampari.find(s => s.kor_ime == nabavka.ponude[i].stampar)
            if (ponudjac == null) {
                continue
            }
            const pobedio = ponudjac.kor_ime == faktura.stampar
            const tekst = pobedio
                ? 'Postovani,\n\nVasa ponuda za javnu nabavku br. ' + nabavka.id_nabavke + ' je izabrana kao najpovoljnija (' + faktura.ukupan_iznos +
                    ' din). Formirana je faktura br. ' + faktura.id_fakture + ' u statusu "u stampi".\n\nPrinting House'
                : 'Postovani,\n\nlicitacija za javnu nabavku br. ' + nabavka.id_nabavke + ' je zakljucena. Izabrana je ponuda stamparije ' +
                    nazivPobednika + ' (' + faktura.ukupan_iznos + ' din).\n\nPrinting House'
            posaljiObavestenje(String(ponudjac.email), 'Ishod licitacije - javna nabavka br. ' + nabavka.id_nabavke, tekst).catch(err => {
                console.log(err)
            })
        }
    }

    zakljuciJednu = (nabavka: any, proizvodi: any[], stampari: any[]) => {
        return JavnaNabavkaModel.updateOne(
            { id_nabavke: nabavka.id_nabavke, status: 'otvorena' },
            { status: 'zakljucena', pobednik: '' }
        ).then(rezultat => {
            if (rezultat.modifiedCount == 0) {
                return null
            }

            const moguce = nabavka.ponude.filter((ponuda: any) => this.imaDovoljno(proizvodi, ponuda, nabavka))
            if (moguce.length == 0) {
                return null
            }

            moguce.sort((a: any, b: any) => Number(a.ukupna_cena) - Number(b.ukupna_cena))
            const pobednicka = moguce[0]
            const stampar = stampari.find(s => s.kor_ime == pobednicka.stampar)

            const stavkeFakture = nabavka.stavke.map((trazena: any, j: number) => {
                const stavkaPonude = pobednicka.stavke.find((s: any) => s.sifra == trazena.sifra)
                const cena = stavkaPonude == null ? 0 : Number(stavkaPonude.cena_po_komadu)
                const kodPobednika = this.izabraniProizvod(proizvodi, pobednicka, trazena)
                return {
                    id_stavke: j + 1,
                    sifra: kodPobednika.sifra,
                    naziv: kodPobednika.naziv,
                    kolicina: Number(trazena.kolicina),
                    boja: kodPobednika.dostupne_boje.length > 0 ? kodPobednika.dostupne_boje[0] : 'Bela',
                    tip_stampe: 'Javna nabavka',
                    cena_po_komadu: cena,
                    ukupno: cena * Number(trazena.kolicina),
                    tekst_stampe: 'Javna nabavka br. ' + nabavka.id_nabavke,
                    slika_stampe: ''
                }
            })

            for (let j = 0; j < stavkeFakture.length; j++) {
                const proizvod = proizvodi.find(p => p.sifra == stavkeFakture[j].sifra)
                proizvod.kolicina_na_lageru = Number(proizvod.kolicina_na_lageru) - stavkeFakture[j].kolicina
            }

            let novaFaktura: any = null
            return FakturaModel.findOne({}).sort({ id_fakture: -1 }).then(poslednja => {
                novaFaktura = {
                    id_fakture: Number(poslednja?.id_fakture ?? 0) + 1,
                    klijent: nabavka.klijent,
                    stampar: pobednicka.stampar,
                    grad: stampar == null ? '' : stampar.grad,
                    datum: new Date(),
                    status: 'u stampi',
                    ukupan_iznos: Number(pobednicka.ukupna_cena),
                    stavke: stavkeFakture
                }
                return FakturaModel.insertMany([novaFaktura])
            }).then(() => {
                this.obavestiOIshodu(nabavka, novaFaktura, stampari)
                return null
            }).then(() => {
                return Promise.all(stavkeFakture.map((stavka: any) => {
                    return ProizvodModel.updateOne(
                        { sifra: stavka.sifra, stampar: pobednicka.stampar },
                        { $inc: { kolicina_na_lageru: -stavka.kolicina } }
                    )
                }))
            }).then(() => {
                return JavnaNabavkaModel.updateOne({ id_nabavke: nabavka.id_nabavke }, { pobednik: pobednicka.stampar })
            })
        })
    }

    zakljuciIstekle = (kor_ime: string) => {
        return JavnaNabavkaModel.find({ klijent: kor_ime, status: 'otvorena' }).lean().then(nabavkeIzBaze => {
            const nabavke: any[] = nabavkeIzBaze
            const istekle = nabavke.filter(n => this.jeIstekla(n) == true)

            if (istekle.length == 0) {
                return null
            }

            return ProizvodModel.find({}).lean().then(proizvodiIzBaze => {
                const proizvodi: any[] = proizvodiIzBaze

                return KorisnikModel.find({ tip: 'stampar' }).lean().then(stampariIzBaze => {
                    const stampari: any[] = stampariIzBaze
                    let redosled: Promise<any> = Promise.resolve(null)

                    for (let i = 0; i < istekle.length; i++) {
                        redosled = redosled.then(() => this.zakljuciJednu(istekle[i], proizvodi, stampari))
                    }

                    return redosled
                })
            })
        })
    }

    dohvatiNabavkeKlijenta = (req: express.Request, res: express.Response) => {
        let kor_ime = String(req.params.kor_ime)

        this.zakljuciIstekle(kor_ime).then(() => {
            JavnaNabavkaModel.find({ klijent: kor_ime }).sort({ datum: -1 }).lean().then(nabavkeIzBaze => {
                const nabavke: any[] = nabavkeIzBaze

                KorisnikModel.find({ tip: 'stampar' }).lean().then(stampariIzBaze => {
                    const stampari: any[] = stampariIzBaze

                    for (let i = 0; i < nabavke.length; i++) {
                        const pobednik = stampari.find(s => s.kor_ime == nabavke[i].pobednik)
                        nabavke[i].naziv_pobednika = pobednik == null ? '' : this.nazivKorisnika(pobednik)
                        const ponuda = nabavke[i].ponude.find((p: any) => p.stampar == nabavke[i].pobednik)
                        nabavke[i].iznos_pobednika = ponuda == null ? 0 : ponuda.ukupna_cena
                        nabavke[i].istice = new Date(new Date(nabavke[i].datum).getTime() + trajanjeLicitacije)
                    }

                    res.json(nabavke)
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

    izvestaj = (req: express.Request, res: express.Response) => {
        let id_nabavke = Number(req.params.id_nabavke)

        if (isNaN(id_nabavke)) {
            res.sendStatus(500)
            return
        }

        JavnaNabavkaModel.findOne({ id_nabavke: id_nabavke }).lean().then(nabavka => {
            if (nabavka == null || nabavka.status != 'zakljucena') {
                res.sendStatus(500)
                return
            }

            KorisnikModel.find({}).lean().then(korisniciIzBaze => {
                const korisnici: any[] = korisniciIzBaze
                const narucilac = korisnici.find(k => k.kor_ime == nabavka.klijent)

                let naziviStampara: any = {}
                for (let i = 0; i < korisnici.length; i++) {
                    naziviStampara[korisnici[i].kor_ime] = this.nazivKorisnika(korisnici[i])
                }

                napraviIzvestaj(nabavka, this.nazivKorisnika(narucilac), naziviStampara).then(putanja => {
                    res.sendFile(putanja)
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
