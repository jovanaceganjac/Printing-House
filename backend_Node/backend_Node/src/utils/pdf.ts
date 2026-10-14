import fs from 'fs'
import path from 'path'
import PDFDocument from 'pdfkit'

const folderFaktura = path.join(__dirname, '..', '..', 'uploads', 'fakture')

const kandidatiFontova = [
    ['C:/Windows/Fonts/arial.ttf', 'C:/Windows/Fonts/arialbd.ttf'],
    ['/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'],
    ['/usr/share/fonts/dejavu/DejaVuSans.ttf', '/usr/share/fonts/dejavu/DejaVuSans-Bold.ttf'],
    ['/System/Library/Fonts/Supplemental/Arial.ttf', '/System/Library/Fonts/Supplemental/Arial Bold.ttf'],
    ['/Library/Fonts/Arial.ttf', '/Library/Fonts/Arial Bold.ttf']
]

const sistemskiFont = kandidatiFontova.find(k => fs.existsSync(k[0]) && fs.existsSync(k[1]))

export const bezDijakritike = (tekst: any) => {
    if (sistemskiFont != null) {
        return String(tekst ?? '')
    }
    return String(tekst ?? '').replace(/đ/g, 'dj').replace(/Đ/g, 'Dj')
        .normalize('NFD').replace(/[̀-ͯ]/g, '')
}

const pripremiFontove = (dokument: any) => {
    if (sistemskiFont != null) {
        dokument.registerFont('obican', sistemskiFont[0])
        dokument.registerFont('podebljan', sistemskiFont[1])
    }
    obicno(dokument)
}

const obicno = (dokument: any) => {
    dokument.font(sistemskiFont != null ? 'obican' : 'Helvetica')
}

const podebljano = (dokument: any) => {
    dokument.font(sistemskiFont != null ? 'podebljan' : 'Helvetica-Bold')
}

const nazivStatusa = (status: any) => {
    const nazivi: any = { 'naruceno': 'naručeno', 'placeno': 'plaćeno', 'u stampi': 'u štampi', 'isporuceno': 'isporučeno', 'primljeno': 'primljeno', 'otvorena': 'otvorena', 'zakljucena': 'zaključena' }
    return bezDijakritike(nazivi[status] ? nazivi[status] : status)
}

export const putanjaFakture = (id_fakture: number) => {
    return path.join(folderFaktura, 'faktura_' + id_fakture + '.pdf')
}

export const opisKupca = (korisnik: any) => {
    if (korisnik == null) {
        return []
    }
    let redovi: string[] = []
    if (korisnik.naziv_institucije) {
        redovi.push(korisnik.naziv_institucije)
        redovi.push('PIB ' + korisnik.pib + ', MB ' + korisnik.maticni_broj)
        redovi.push(korisnik.adresa_sedista + ', ' + korisnik.grad)
        redovi.push('Odgovorno lice: ' + korisnik.ime + ' ' + korisnik.prezime)
    }
    else {
        redovi.push(korisnik.ime + ' ' + korisnik.prezime)
    }
    redovi.push(korisnik.email)
    return redovi
}

export const napraviPdf = (faktura: any, naziv_stamparije: string, kupac: string[] = []) => {
    return new Promise<string>((uspeh, neuspeh) => {
        if (fs.existsSync(folderFaktura) == false) {
            fs.mkdirSync(folderFaktura, { recursive: true })
        }

        const putanja = putanjaFakture(faktura.id_fakture)
        const dokument = new PDFDocument({ margin: 40 })
        const tok = fs.createWriteStream(putanja)

        tok.on('finish', () => uspeh(putanja))
        tok.on('error', (err: any) => neuspeh(err))
        dokument.pipe(tok)
        pripremiFontove(dokument)

        const iznos = (broj: any) => Number(broj).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

        podebljano(dokument)
        dokument.fontSize(20).fillColor('#0E2A47').text('Printing House', 40, 40)
        obicno(dokument)
        dokument.fontSize(9).fillColor('#667486').text('Platforma za štamparije', 40, 64)
        podebljano(dokument)
        dokument.fontSize(16).fillColor('#0E2A47').text('FAKTURA br. ' + faktura.id_fakture, 300, 40, { width: 255, align: 'right' })
        obicno(dokument)
        dokument.fontSize(10).fillColor('#2B3440')
        dokument.text('Datum izdavanja: ' + new Date(faktura.datum).toLocaleDateString('sr-Latn-RS'), 300, 62, { width: 255, align: 'right' })
        dokument.text('Status: ' + nazivStatusa(faktura.status), 300, 76, { width: 255, align: 'right' })

        dokument.moveTo(40, 100).lineTo(555, 100).lineWidth(2).strokeColor('#0E2A47').stroke()

        podebljano(dokument)
        dokument.fontSize(10).fillColor('#667486').text('IZDAVALAC', 40, 115)
        dokument.text('KUPAC', 300, 115)
        obicno(dokument)
        dokument.fontSize(11).fillColor('#2B3440')
        dokument.text(bezDijakritike(naziv_stamparije), 40, 130, { width: 240 })
        dokument.text(bezDijakritike(faktura.grad), 40, 145, { width: 240 })
        const redoviKupca = kupac.length > 0 ? kupac : [faktura.klijent]
        for (let i = 0; i < redoviKupca.length; i++) {
            dokument.text(bezDijakritike(redoviKupca[i]), 300, 130 + i * 14, { width: 255 })
        }

        const kolone = [40, 62, 250, 290, 350, 430, 490]
        let y = Math.max(185, 150 + redoviKupca.length * 14)
        dokument.rect(40, y - 6, 515, 20).fill('#F3F5F7')
        podebljano(dokument)
        dokument.fontSize(9).fillColor('#0E2A47')
        dokument.text('Rb', kolone[0], y)
        dokument.text('Proizvod', kolone[1], y)
        dokument.text('Kol.', kolone[2], y, { width: 35, align: 'right' })
        dokument.text('Boja', kolone[3] + 8, y)
        dokument.text('Vrsta štampe', kolone[4], y)
        dokument.text('Cena/kom', kolone[5], y, { width: 55, align: 'right' })
        dokument.text('Ukupno', kolone[6], y, { width: 65, align: 'right' })
        y = y + 20

        obicno(dokument)
        for (let i = 0; i < faktura.stavke.length; i++) {
            const stavka = faktura.stavke[i]
            if (y > 720) {
                dokument.addPage()
                y = 50
            }
            dokument.fontSize(9).fillColor('#2B3440')
            dokument.text(String(i + 1), kolone[0], y)
            dokument.text(bezDijakritike(stavka.naziv), kolone[1], y, { width: 180 })
            dokument.text(String(stavka.kolicina), kolone[2], y, { width: 35, align: 'right' })
            dokument.text(bezDijakritike(stavka.boja), kolone[3] + 8, y, { width: 55 })
            dokument.text(bezDijakritike(stavka.tip_stampe), kolone[4], y, { width: 78 })
            dokument.text(iznos(stavka.cena_po_komadu), kolone[5], y, { width: 55, align: 'right' })
            dokument.text(iznos(stavka.ukupno), kolone[6], y, { width: 65, align: 'right' })
            let visina = Math.max(dokument.heightOfString(bezDijakritike(stavka.naziv), { width: 180 }), dokument.heightOfString(bezDijakritike(stavka.tip_stampe), { width: 78 }))
            if (stavka.tekst_stampe) {
                dokument.fontSize(8).fillColor('#667486').text('Tekst za štampu: ' + bezDijakritike(stavka.tekst_stampe), kolone[1], y + visina + 1, { width: 360 })
                visina = visina + 11
            }
            y = y + visina + 8
            dokument.moveTo(40, y - 4).lineTo(555, y - 4).lineWidth(0.5).strokeColor('#DDE3E9').stroke()
        }

        podebljano(dokument)
        dokument.fontSize(12).fillColor('#0E2A47')
        dokument.text('UKUPNO ZA UPLATU:', 300, y + 8, { width: 150 })
        dokument.text(iznos(faktura.ukupan_iznos) + ' din', 430, y + 8, { width: 125, align: 'right' })
        obicno(dokument)
        dokument.fontSize(8).fillColor('#667486').text('Faktura je izdata elektronski preko platforme Printing House i važi bez pečata i potpisa.', 40, y + 40, { width: 515 })

        dokument.end()
    })
}

export const putanjaIzvestaja = (id_nabavke: number) => {
    return path.join(folderFaktura, 'nabavka_' + id_nabavke + '.pdf')
}

export const napraviIzvestaj = (nabavka: any, naziv_narucioca: string, naziviStampara: any) => {
    return new Promise<string>((uspeh, neuspeh) => {
        if (fs.existsSync(folderFaktura) == false) {
            fs.mkdirSync(folderFaktura, { recursive: true })
        }

        const putanja = putanjaIzvestaja(nabavka.id_nabavke)
        const dokument = new PDFDocument({ margin: 40 })
        const tok = fs.createWriteStream(putanja)

        tok.on('finish', () => uspeh(putanja))
        tok.on('error', (err: any) => neuspeh(err))
        dokument.pipe(tok)
        pripremiFontove(dokument)

        podebljano(dokument)
        dokument.fontSize(16).fillColor('#0E2A47').text('IZVEŠTAJ O JAVNOJ NABAVCI br. ' + nabavka.id_nabavke, { align: 'center' })
        obicno(dokument)
        dokument.fillColor('#2B3440')
        dokument.moveDown()

        dokument.fontSize(11)
        dokument.text('Datum raspisivanja: ' + new Date(nabavka.datum).toLocaleString('en-GB'))
        dokument.text('Naručilac: ' + bezDijakritike(naziv_narucioca))
        dokument.text('Status: ' + nazivStatusa(nabavka.status))
        dokument.moveDown()

        podebljano(dokument)
        dokument.fontSize(13).text('TRAŽENI PROIZVODI')
        obicno(dokument)
        dokument.fontSize(10)
        let y = dokument.y + 6
        dokument.text('Rb', 40, y)
        dokument.text('Šifra', 75, y)
        dokument.text('Naziv', 130, y)
        dokument.text('Količina', 400, y)
        y = y + 14
        dokument.moveTo(40, y - 3).lineTo(545, y - 3).stroke()

        for (let i = 0; i < nabavka.stavke.length; i++) {
            dokument.text(String(i + 1), 40, y)
            dokument.text(bezDijakritike(nabavka.stavke[i].sifra), 75, y)
            dokument.text(bezDijakritike(nabavka.stavke[i].naziv).substring(0, 40), 130, y, { width: 260 })
            dokument.text(String(nabavka.stavke[i].kolicina), 400, y)
            y = y + 18
        }

        dokument.y = y + 10
        podebljano(dokument)
        dokument.fontSize(13).text('PRISTIGLE PONUDE', 40, dokument.y)
        obicno(dokument)
        dokument.fontSize(10)
        y = dokument.y + 6
        dokument.text('Rb', 40, y)
        dokument.text('Štamparija', 75, y)
        dokument.text('Ukupna cena', 320, y)
        dokument.text('Datum', 430, y)
        y = y + 14
        dokument.moveTo(40, y - 3).lineTo(545, y - 3).stroke()

        if (nabavka.ponude.length == 0) {
            dokument.text('Nije pristigla nijedna ponuda.', 40, y)
            y = y + 18
        }

        const ponude = nabavka.ponude.slice().sort((a: any, b: any) => Number(a.ukupna_cena) - Number(b.ukupna_cena))
        for (let i = 0; i < ponude.length; i++) {
            const ponuda = ponude[i]
            const naziv = naziviStampara[ponuda.stampar] ? naziviStampara[ponuda.stampar] : ponuda.stampar
            if (y > 720) {
                dokument.addPage()
                y = 50
            }
            dokument.fontSize(10)
            dokument.text(String(i + 1), 40, y)
            dokument.text(bezDijakritike(naziv).substring(0, 38) + (ponuda.stampar == nabavka.pobednik ? '  (POBEDNIK)' : ''), 75, y, { width: 240 })
            dokument.text(String(ponuda.ukupna_cena) + ' din', 320, y)
            dokument.text(new Date(ponuda.datum).toLocaleString('en-GB'), 430, y)
            y = y + 16
            dokument.fontSize(8)
            for (let j = 0; j < ponuda.stavke.length; j++) {
                const stavkaPonude = ponuda.stavke[j]
                const trazena = nabavka.stavke.find((s: any) => s.sifra == stavkaPonude.sifra)
                const kolicina = trazena == null ? 0 : Number(trazena.kolicina)
                const ponudjeno = stavkaPonude.naziv_proizvoda ? stavkaPonude.naziv_proizvoda : (trazena == null ? stavkaPonude.sifra : trazena.naziv)
                dokument.text('- ' + bezDijakritike(ponudjeno).substring(0, 45) + ': ' + kolicina + ' x ' + stavkaPonude.cena_po_komadu + ' din = ' + (kolicina * Number(stavkaPonude.cena_po_komadu)) + ' din', 90, y, { width: 450 })
                y = y + 12
            }
            y = y + 6
        }
        dokument.fontSize(10)

        dokument.moveTo(40, y).lineTo(545, y).stroke()
        dokument.y = y + 12

        if (!nabavka.pobednik) {
            dokument.fontSize(12).text('Nijedna ponuda nije ispunila uslove.', 40, dokument.y)
        }
        else {
            const pobednickaPonuda = nabavka.ponude.find((p: any) => p.stampar == nabavka.pobednik)
            const nazivPobednika = naziviStampara[nabavka.pobednik] ? naziviStampara[nabavka.pobednik] : nabavka.pobednik
            podebljano(dokument)
            dokument.fontSize(12).text('POBEDNIK: ' + bezDijakritike(nazivPobednika), 40, dokument.y)
            if (pobednickaPonuda != null) {
                dokument.text('Iznos pobedničke ponude: ' + pobednickaPonuda.ukupna_cena + ' din')
            }
        }

        dokument.end()
    })
}
