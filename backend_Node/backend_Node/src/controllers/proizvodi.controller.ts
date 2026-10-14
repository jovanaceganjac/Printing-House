import * as express from 'express';
import ProizvodModel from '../models/proizvod'
import KorisnikModel from '../models/korisnik'
import KategorijaModel from '../models/kategorija'
import FakturaModel from '../models/faktura'

export class ProizvodiController {

    dodajNazivStamparije = (proizvodi: any[], stampari: any[]) => {
        return proizvodi.map(proizvod => {
            const stampar = stampari.find(s => s.kor_ime == proizvod.stampar)
            if (stampar != null && stampar.naziv_institucije != null && stampar.naziv_institucije != '') {
                proizvod.naziv_stamparije = stampar.naziv_institucije
            }
            else {
                proizvod.naziv_stamparije = proizvod.stampar
            }
            return proizvod
        })
    }

    dohvatiSveProizvode = (req: express.Request, res: express.Response) => {
        ProizvodModel.find({}).then(proizvodi => {
            res.json(proizvodi)
        }).catch(err => {
            console.log(err)
            res.json([])
        })
    }

    dohvatiProizvod = (req: express.Request, res: express.Response) => {
        let sifra = req.params.sifra

        ProizvodModel.findOne({ sifra: sifra }).lean().then(proizvod => {
            if (proizvod == null) {
                res.json(null)
                return
            }
            KorisnikModel.find({ tip: 'stampar' }).lean().then(stampari => {
                res.json(this.dodajNazivStamparije([proizvod], stampari)[0])
            }).catch(err => {
                console.log(err)
                res.json(null)
            })
        }).catch(err => {
            console.log(err)
            res.json(null)
        })
    }

    top5Proizvoda = (req: express.Request, res: express.Response) => {
        KorisnikModel.find({ tip: 'stampar', status: 'odobren' }).lean().then(stampari => {
            let uslov: any = { kolicina_na_lageru: { $gt: 0 }, stampar: { $in: stampari.map(s => s.kor_ime) } }
            ProizvodModel.find(uslov).sort({ broj_svidjanja: -1 }).limit(5).lean().then(proizvodi => {
                res.json(this.dodajNazivStamparije(proizvodi, stampari))
            }).catch(err => {
                console.log(err)
                res.json([])
            })
        }).catch(err => {
            console.log(err)
            res.json([])
        })
    }

    pretraziProizvode = (req: express.Request, res: express.Response) => {
        let naziv = req.body.naziv
        let kategorija = req.body.kategorija

        let trazeno = naziv != null ? this.bezDijakritike(naziv) : ''

        let uslov: any = { kolicina_na_lageru: { $gt: 0 } }
        if (kategorija != null && kategorija != '' && kategorija != 'Sve kategorije') {
            uslov.kategorija = String(kategorija)
        }

        KorisnikModel.find({ tip: 'stampar', status: 'odobren' }).lean().then(stampari => {
            uslov.stampar = { $in: stampari.map(s => s.kor_ime) }
            ProizvodModel.find(uslov).lean().then(proizvodi => {
                const rezultat = proizvodi.filter(p => trazeno == '' || this.bezDijakritike(String(p.naziv)).indexOf(trazeno) >= 0)
                res.json(this.dodajNazivStamparije(rezultat, stampari))
            }).catch(err => {
                console.log(err)
                res.json([])
            })
        }).catch(err => {
            console.log(err)
            res.json([])
        })
    }

    dohvatiProizvodeStampara = (req: express.Request, res: express.Response) => {
        let kor_ime = req.params.kor_ime

        ProizvodModel.find({ stampar: kor_ime }).then(proizvodi => {
            res.json(proizvodi)
        }).catch(err => {
            console.log(err)
            res.json([])
        })
    }

    dodajProizvod = (req: express.Request, res: express.Response) => {
        let proizvod = req.body
        let kor_ime = String(proizvod.kor_ime ?? '')
        let naziv = String(proizvod.naziv ?? '').trim()
        let kategorija = String(proizvod.kategorija ?? '')
        let potkategorija = String(proizvod.potkategorija ?? '')
        let jedinicna_cena = Number(proizvod.jedinicna_cena)
        let kolicina_na_lageru = Number(proizvod.kolicina_na_lageru)
        let dodatne_slike = Array.isArray(proizvod.dodatne_slike) ? proizvod.dodatne_slike.filter((d: any) => String(d).startsWith('/uploads/')) : []
        let usluge = Array.isArray(proizvod.usluge_stampe) ? proizvod.usluge_stampe : []
        let slika = proizvod.slika && String(proizvod.slika).startsWith('/uploads/') ? String(proizvod.slika) : ''
        let boje = Array.isArray(proizvod.dostupne_boje) ? proizvod.dostupne_boje.map((b: any) => String(b).trim()).filter((b: string) => b != '') : []

        if (naziv == '' || kategorija == '' || potkategorija == '' || slika == '') {
            res.sendStatus(500)
            return
        }
        if (isNaN(jedinicna_cena) || jedinicna_cena <= 0) {
            res.sendStatus(500)
            return
        }
        if (isNaN(kolicina_na_lageru) || kolicina_na_lageru < 0 || Number.isInteger(kolicina_na_lageru) == false) {
            res.sendStatus(500)
            return
        }
        if (dodatne_slike.length > 3) {
            res.sendStatus(500)
            return
        }
        for (let i = 0; i < usluge.length; i++) {
            if (usluge[i] == null || String(usluge[i].tip_stampe ?? '').trim() == '') {
                res.sendStatus(500)
                return
            }
            if (isNaN(Number(usluge[i].dodatna_cena_po_komadu)) || Number(usluge[i].dodatna_cena_po_komadu) < 0) {
                res.sendStatus(500)
                return
            }
            if (isNaN(Number(usluge[i].max_sirina_mm)) || Number(usluge[i].max_sirina_mm) <= 0) {
                res.sendStatus(500)
                return
            }
            if (isNaN(Number(usluge[i].max_visina_mm)) || Number(usluge[i].max_visina_mm) <= 0) {
                res.sendStatus(500)
                return
            }
        }

        KategorijaModel.findOne({ naziv: kategorija, potkategorije: potkategorija }).then(kategorijaIzBaze => {
            if (kategorijaIzBaze == null) {
                res.sendStatus(500)
                return
            }
            KorisnikModel.findOne({ kor_ime: kor_ime, tip: 'stampar' }).then(stampar => {
                if (stampar == null) {
                    res.sendStatus(500)
                    return
                }
                ProizvodModel.find({}, { sifra: 1 }).lean().then(postojeci => {
                    let novaSifra = this.sledecaSifra(postojeci.map(p => String(p.sifra)))

                    let uslugeSaId = usluge.map((u: any, i: number) => {
                        return {
                            id_usluge: i + 1,
                            tip_stampe: String(u.tip_stampe).trim(),
                            dodatna_cena_po_komadu: Number(u.dodatna_cena_po_komadu),
                            max_sirina_mm: Number(u.max_sirina_mm),
                            max_visina_mm: Number(u.max_visina_mm)
                        }
                    })

                    const novi = new ProizvodModel({
                        sifra: novaSifra,
                        naziv: naziv,
                        opis: String(proizvod.opis ?? '').trim(),
                        kategorija: kategorija,
                        potkategorija: potkategorija,
                        jedinicna_cena: jedinicna_cena,
                        kolicina_na_lageru: kolicina_na_lageru,
                        dostupne_boje: boje,
                        slika: slika,
                        dodatne_slike: dodatne_slike,
                        stampar: stampar.kor_ime,
                        grad: stampar.grad,
                        usluge_stampe: uslugeSaId,
                        broj_svidjanja: 0,
                        broj_nesvidjanja: 0,
                        ocene: [],
                        komentari: []
                    })
                    novi.save().then(() => {
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

    bezDijakritike = (tekst: string) => {
        return String(tekst).replace(/đ/g, 'dj').replace(/Đ/g, 'Dj')
            .normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
    }

    sledecaSifra = (sifre: string[]) => {
        let najveci = 0
        for (let i = 0; i < sifre.length; i++) {
            const poklapanje = /^p([0-9]+)$/.exec(sifre[i])
            if (poklapanje != null && Number(poklapanje[1]) > najveci) {
                najveci = Number(poklapanje[1])
            }
        }
        return 'p' + String(najveci + 1).padStart(3, '0')
    }

    obrnutaTabela = (kodnaStrana: string) => {
        const dekoder = new TextDecoder(kodnaStrana)
        let tabela: any = {}
        for (let b = 0; b < 256; b++) {
            const znak = dekoder.decode(new Uint8Array([b]))
            if (znak != '�' && tabela[znak] == null) {
                tabela[znak] = b
            }
        }
        return tabela
    }

    dekodirajUtf8 = (bajtovi: number[]) => {
        try {
            return new TextDecoder('utf-8', { fatal: true }).decode(new Uint8Array(bajtovi))
        }
        catch (greska) {
            return null
        }
    }

    popraviTekst = (tekst: string) => {
        if (/^[\x00-\x7F]*$/.test(tekst)) {
            return tekst
        }
        const kodneStrane = ['windows-1251', 'windows-1252']
        for (let k = 0; k < kodneStrane.length; k++) {
            const tabela = this.obrnutaTabela(kodneStrane[k])
            let bajtovi: number[] = []
            let moguce = true
            for (const znak of tekst) {
                if (tabela[znak] == null) {
                    moguce = false
                    break
                }
                bajtovi.push(tabela[znak])
            }
            if (moguce == false) {
                continue
            }
            let popravljen = this.dekodirajUtf8(bajtovi)
            if (popravljen == null) {
                const saRazmakom = bajtovi.map((b, i) => (b == 0x20 && i > 0 && bajtovi[i - 1] >= 0xC2 && bajtovi[i - 1] <= 0xDF) ? 0xA0 : b)
                popravljen = this.dekodirajUtf8(saRazmakom)
            }
            if (popravljen != null && popravljen != tekst) {
                return popravljen
            }
        }
        return tekst
    }

    popraviKodiranje = (vrednost: any): any => {
        if (typeof vrednost == 'string') {
            return this.popraviTekst(vrednost)
        }
        if (Array.isArray(vrednost)) {
            return vrednost.map(v => this.popraviKodiranje(v))
        }
        if (vrednost != null && typeof vrednost == 'object') {
            let rezultat: any = {}
            for (let kljuc in vrednost) {
                rezultat[kljuc] = this.popraviKodiranje(vrednost[kljuc])
            }
            return rezultat
        }
        return vrednost
    }

    dodajViseProizvoda = (req: express.Request, res: express.Response) => {
        let kor_ime = String(req.body.kor_ime)
        let ulaz = Array.isArray(req.body.proizvodi) ? this.popraviKodiranje(req.body.proizvodi) : []

        if (kor_ime == '' || ulaz.length == 0) {
            res.sendStatus(500)
            return
        }

        KorisnikModel.findOne({ kor_ime: kor_ime, tip: 'stampar' }).then(stampar => {
            if (stampar == null) {
                res.sendStatus(500)
                return
            }

            KategorijaModel.find({}).lean().then(kategorijeIzBaze => {
                const kategorije: any[] = kategorijeIzBaze

                ProizvodModel.find({}, { sifra: 1 }).lean().then(postojeci => {
                    let zauzeteSifre = postojeci.map(p => String(p.sifra))
                    let noviProizvodi: any[] = []
                    let preskoceno = 0
                    let preskoceni: any[] = []

                    for (let i = 0; i < ulaz.length; i++) {
                        const stavka = ulaz[i] != null ? ulaz[i] : {}
                        const naziv = stavka.naziv ? String(stavka.naziv).trim() : ''
                        const nazivKategorije = stavka.kategorija ? String(stavka.kategorija) : ''
                        const nazivPotkategorije = stavka.potkategorija ? String(stavka.potkategorija) : ''
                        const cena = Number(stavka.jedinicnaCena)
                        const kolicina = Number(stavka.kolicinaNaLageru)

                        if (naziv == '' || nazivKategorije == '' || nazivPotkategorije == '' || isNaN(cena) || cena <= 0 || isNaN(kolicina) || kolicina < 0 || Number.isInteger(kolicina) == false) {
                            preskoceno = preskoceno + 1
                            preskoceni.push({ naziv: naziv, razlog: 'nedostaje naziv, kategorija, potkategorija, cena ili kolicina' })
                            continue
                        }

                        const kategorija = kategorije.find(k => this.bezDijakritike(k.naziv) == this.bezDijakritike(nazivKategorije))
                        if (kategorija == null) {
                            preskoceno = preskoceno + 1
                            preskoceni.push({ naziv: naziv, razlog: 'kategorija "' + nazivKategorije + '" ne postoji' })
                            continue
                        }

                        const potkategorija = kategorija.potkategorije.find((p: string) => this.bezDijakritike(p) == this.bezDijakritike(nazivPotkategorije))
                        if (potkategorija == null) {
                            preskoceno = preskoceno + 1
                            preskoceni.push({ naziv: naziv, razlog: 'potkategorija "' + nazivPotkategorije + '" ne postoji u kategoriji ' + kategorija.naziv })
                            continue
                        }

                        const usluge = Array.isArray(stavka.uslugeStampe) ? stavka.uslugeStampe : []
                        const ispravneUsluge = usluge.filter((u: any) => {
                            return u != null && u.tipStampe && String(u.tipStampe).trim() != '' &&
                                isNaN(Number(u.dodatnaCenaPoKomadu)) == false && Number(u.dodatnaCenaPoKomadu) >= 0 &&
                                isNaN(Number(u.maxSirinaMm)) == false && Number(u.maxSirinaMm) > 0 &&
                                isNaN(Number(u.maxVisinaMm)) == false && Number(u.maxVisinaMm) > 0
                        })
                        const uslugeSaId = ispravneUsluge.map((u: any, j: number) => {
                            return {
                                id_usluge: j + 1,
                                tip_stampe: String(u.tipStampe).trim(),
                                dodatna_cena_po_komadu: Number(u.dodatnaCenaPoKomadu),
                                max_sirina_mm: Number(u.maxSirinaMm),
                                max_visina_mm: Number(u.maxVisinaMm)
                            }
                        })

                        let sifra = stavka.sifra ? String(stavka.sifra).trim() : ''
                        if (/^[A-Za-z0-9_-]{1,30}$/.test(sifra) == false || zauzeteSifre.indexOf(sifra) >= 0) {
                            sifra = this.sledecaSifra(zauzeteSifre)
                        }
                        zauzeteSifre.push(sifra)

                        let dodatne = Array.isArray(stavka.dodatneSlike) ? stavka.dodatneSlike.filter((d: any) => String(d).startsWith('/uploads/')) : []
                        if (dodatne.length > 3) {
                            dodatne = dodatne.slice(0, 3)
                        }
                        const slika = stavka.slikaUrl && String(stavka.slikaUrl).startsWith('/uploads/') ? String(stavka.slikaUrl) : ''

                        noviProizvodi.push({
                            sifra: sifra,
                            naziv: naziv,
                            opis: stavka.opis ? stavka.opis : '',
                            kategorija: kategorija.naziv,
                            potkategorija: potkategorija,
                            jedinicna_cena: cena,
                            kolicina_na_lageru: kolicina,
                            dostupne_boje: Array.isArray(stavka.dostupneBoje) ? stavka.dostupneBoje.map((b: any) => String(b).trim()).filter((b: string) => b != '') : [],
                            slika: slika,
                            dodatne_slike: dodatne,
                            stampar: stampar.kor_ime,
                            grad: stampar.grad,
                            usluge_stampe: uslugeSaId,
                            broj_svidjanja: 0,
                            broj_nesvidjanja: 0,
                            ocene: [],
                            komentari: []
                        })
                    }

                    if (noviProizvodi.length == 0) {
                        res.json({ ubaceno: 0, preskoceno: preskoceno, preskoceni: preskoceni, sifre: [] })
                        return
                    }

                    ProizvodModel.insertMany(noviProizvodi).then(() => {
                        res.json({ ubaceno: noviProizvodi.length, preskoceno: preskoceno, preskoceni: preskoceni, sifre: noviProizvodi.map(p => p.sifra) })
                    }).catch(err => {
                        console.log(err)
                        res.json(null)
                    })
                }).catch(err => {
                    console.log(err)
                    res.json(null)
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

    azurirajSliku = (req: express.Request, res: express.Response) => {
        let sifra = String(req.body.sifra)
        let kor_ime = String(req.body.kor_ime)
        let slika = String(req.body.slika)

        if (sifra == '' || kor_ime == '' || slika.startsWith('/uploads/') == false) {
            res.sendStatus(500)
            return
        }

        ProizvodModel.findOne({ sifra: sifra }).then(proizvod => {
            if (proizvod == null || proizvod.stampar != kor_ime) {
                res.sendStatus(500)
                return
            }
            ProizvodModel.updateOne({ sifra: sifra }, { slika: slika }).then(() => {
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

    dodajUslugu = (req: express.Request, res: express.Response) => {
        let sifra = String(req.body.sifra)
        let kor_ime = String(req.body.kor_ime)
        let tip_stampe = String(req.body.tip_stampe ?? '').trim()
        let dodatna_cena_po_komadu = Number(req.body.dodatna_cena_po_komadu)
        let max_sirina_mm = Number(req.body.max_sirina_mm)
        let max_visina_mm = Number(req.body.max_visina_mm)

        if (tip_stampe == '' || isNaN(dodatna_cena_po_komadu) || dodatna_cena_po_komadu < 0) {
            res.sendStatus(500)
            return
        }
        if (isNaN(max_sirina_mm) || max_sirina_mm <= 0 || isNaN(max_visina_mm) || max_visina_mm <= 0) {
            res.sendStatus(500)
            return
        }

        ProizvodModel.findOne({ sifra: sifra }).then(proizvod => {
            if (proizvod == null || proizvod.stampar != kor_ime) {
                res.sendStatus(500)
                return
            }
            if (proizvod.usluge_stampe.find(u => this.bezDijakritike(String(u.tip_stampe)) == this.bezDijakritike(tip_stampe)) != null) {
                res.sendStatus(500)
                return
            }
            let najveci = 0
            for (let i = 0; i < proizvod.usluge_stampe.length; i++) {
                if (Number(proizvod.usluge_stampe[i].id_usluge) > najveci) {
                    najveci = Number(proizvod.usluge_stampe[i].id_usluge)
                }
            }
            ProizvodModel.updateOne({ sifra: sifra }, {
                $push: {
                    usluge_stampe: {
                        id_usluge: najveci + 1,
                        tip_stampe: tip_stampe,
                        dodatna_cena_po_komadu: dodatna_cena_po_komadu,
                        max_sirina_mm: max_sirina_mm,
                        max_visina_mm: max_visina_mm
                    }
                }
            }).then(() => {
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

    dodajDodatnuSliku = (req: express.Request, res: express.Response) => {
        let sifra = String(req.body.sifra)
        let kor_ime = String(req.body.kor_ime)
        let slika = String(req.body.slika)

        if (sifra == '' || kor_ime == '' || slika.startsWith('/uploads/') == false) {
            res.sendStatus(500)
            return
        }

        ProizvodModel.findOne({ sifra: sifra }).then(proizvod => {
            if (proizvod == null || proizvod.stampar != kor_ime || proizvod.dodatne_slike.length >= 3) {
                res.sendStatus(500)
                return
            }
            ProizvodModel.updateOne({ sifra: sifra }, { $push: { dodatne_slike: slika } }).then(() => {
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

    ukloniDodatnuSliku = (req: express.Request, res: express.Response) => {
        let sifra = String(req.body.sifra)
        let kor_ime = String(req.body.kor_ime)
        let slika = String(req.body.slika)

        ProizvodModel.findOne({ sifra: sifra }).then(proizvod => {
            if (proizvod == null || proizvod.stampar != kor_ime) {
                res.sendStatus(500)
                return
            }
            ProizvodModel.updateOne({ sifra: sifra }, { $pull: { dodatne_slike: slika } }).then(() => {
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

    azurirajKolicinu = (req: express.Request, res: express.Response) => {
        let sifra = String(req.body.sifra)
        let kor_ime = String(req.body.kor_ime)
        let kolicina_na_lageru = Number(req.body.kolicina_na_lageru)

        if (sifra == '' || kor_ime == '') {
            res.sendStatus(500)
            return
        }
        if (isNaN(kolicina_na_lageru) || kolicina_na_lageru < 0 || Number.isInteger(kolicina_na_lageru) == false) {
            res.sendStatus(500)
            return
        }

        ProizvodModel.findOne({ sifra: sifra }).then(proizvod => {
            if (proizvod == null || proizvod.stampar != kor_ime) {
                res.sendStatus(500)
                return
            }
            ProizvodModel.updateOne({ sifra: sifra }, { kolicina_na_lageru: kolicina_na_lageru }).then(() => {
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

    obrisiProizvod = (req: express.Request, res: express.Response) => {
        let sifra = String(req.params.sifra)
        let kor_ime = String(req.body.kor_ime)

        if (sifra == '' || kor_ime == '') {
            res.sendStatus(500)
            return
        }

        ProizvodModel.findOne({ sifra: sifra }).then(proizvod => {
            if (proizvod == null || proizvod.stampar != kor_ime) {
                res.sendStatus(500)
                return
            }
            ProizvodModel.deleteOne({ sifra: sifra }).then(() => {
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

    oceniProizvod = (req: express.Request, res: express.Response) => {
        let sifra = String(req.body.sifra)
        let kor_ime = String(req.body.kor_ime)
        let vrednost = Number(req.body.vrednost)

        if (sifra == '' || kor_ime == '') {
            res.sendStatus(500)
            return
        }
        if (vrednost != 1 && vrednost != -1) {
            res.sendStatus(500)
            return
        }

        FakturaModel.findOne({ klijent: kor_ime, status: 'primljeno', 'stavke.sifra': sifra }).then(faktura => {
            if (faktura == null) {
                res.sendStatus(500)
                return
            }

            ProizvodModel.findOne({ sifra: sifra }).then(proizvod => {
                if (proizvod == null) {
                    res.sendStatus(500)
                    return
                }

                const stara = proizvod.ocene.find(o => o.kor_ime == kor_ime)

                if (stara == null) {
                    let brojaci: any = {}
                    if (vrednost == 1) {
                        brojaci.broj_svidjanja = 1
                    }
                    else {
                        brojaci.broj_nesvidjanja = 1
                    }
                    ProizvodModel.updateOne(
                        { sifra: sifra },
                        {
                            $push: { ocene: { kor_ime: kor_ime, vrednost: vrednost, datum: new Date() } },
                            $inc: brojaci
                        }
                    ).then(() => {
                        res.sendStatus(200)
                    }).catch(err => {
                        console.log(err)
                        res.sendStatus(500)
                    })
                    return
                }

                if (Number(stara.vrednost) == vrednost) {
                    res.sendStatus(500)
                    return
                }

                let brojaci: any = {}
                if (vrednost == 1) {
                    brojaci.broj_svidjanja = 1
                    brojaci.broj_nesvidjanja = -1
                }
                else {
                    brojaci.broj_svidjanja = -1
                    brojaci.broj_nesvidjanja = 1
                }

                ProizvodModel.updateOne(
                    { sifra: sifra, 'ocene.kor_ime': kor_ime },
                    {
                        $set: { 'ocene.$.vrednost': vrednost, 'ocene.$.datum': new Date() },
                        $inc: brojaci
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
    }

    dodajKomentar = (req: express.Request, res: express.Response) => {
        let sifra = String(req.body.sifra)
        let kor_ime = String(req.body.kor_ime)
        let tekst = String(req.body.tekst).trim()

        if (sifra == '' || kor_ime == '' || tekst == '') {
            res.sendStatus(500)
            return
        }

        FakturaModel.findOne({ klijent: kor_ime, status: 'primljeno', 'stavke.sifra': sifra }).then(faktura => {
            if (faktura == null) {
                res.sendStatus(500)
                return
            }

            ProizvodModel.findOne({ sifra: sifra }).then(proizvod => {
                if (proizvod == null) {
                    res.sendStatus(500)
                    return
                }

                let najveci = 0
                for (let i = 0; i < proizvod.komentari.length; i++) {
                    if (Number(proizvod.komentari[i].id_komentara) > najveci) {
                        najveci = Number(proizvod.komentari[i].id_komentara)
                    }
                }

                ProizvodModel.updateOne(
                    { sifra: sifra },
                    {
                        $push: {
                            komentari: {
                                id_komentara: najveci + 1,
                                kor_ime: kor_ime,
                                datum: new Date(),
                                tekst: tekst
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
    }

    upload = (req: express.Request, res: express.Response) => {
        let datoteka = req.file

        if (datoteka == null) {
            res.json(null)
            return
        }
        res.json({ putanja: '/uploads/products/' + datoteka.filename })
    }

}
