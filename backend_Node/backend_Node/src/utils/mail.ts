import fs from 'fs'
import path from 'path'
import nodemailer from 'nodemailer'

const ucitajOkruzenje = () => {
    const putanja = path.join(__dirname, '..', '..', '.env')
    if (fs.existsSync(putanja) == false) {
        return
    }
    const redovi = fs.readFileSync(putanja, 'utf8').split('\n')
    for (let i = 0; i < redovi.length; i++) {
        const red = redovi[i].trim()
        if (red == '' || red.indexOf('#') == 0) {
            continue
        }
        const znak = red.indexOf('=')
        if (znak < 1) {
            continue
        }
        const kljuc = red.substring(0, znak).trim()
        const vrednost = red.substring(znak + 1).trim()
        if (!process.env[kljuc]) {
            process.env[kljuc] = vrednost
        }
    }
}

ucitajOkruzenje()

export const adresaFrontenda = () => {
    return process.env.FRONTEND_URL ? process.env.FRONTEND_URL : 'http://localhost:4200'
}

export const mailPodesen = () => {
    return !!(process.env.MAIL_HOST && process.env.MAIL_PORT && process.env.MAIL_USER && process.env.MAIL_PASS)
}

let testNalog: any = null

const napraviPosiljaoca = () => {
    if (mailPodesen() == true) {
        const port = Number(process.env.MAIL_PORT)
        return Promise.resolve({
            posiljalac: nodemailer.createTransport({
                host: process.env.MAIL_HOST,
                port: port,
                secure: port == 465,
                auth: { user: process.env.MAIL_USER, pass: process.env.MAIL_PASS }
            }),
            od: String(process.env.MAIL_USER),
            test: false
        })
    }

    const nalog = testNalog != null ? Promise.resolve(testNalog) : nodemailer.createTestAccount().then(n => {
        testNalog = n
        return n
    })

    return nalog.then((n: any) => {
        return {
            posiljalac: nodemailer.createTransport({
                host: n.smtp.host,
                port: n.smtp.port,
                secure: n.smtp.secure,
                auth: { user: n.user, pass: n.pass }
            }),
            od: String(n.user),
            test: true
        }
    })
}

const posalji = (poruka: any) => {
    if (!poruka.to) {
        return Promise.resolve(null)
    }
    return napraviPosiljaoca().then(p => {
        return p.posiljalac.sendMail(Object.assign({ from: 'Printing House <' + p.od + '>' }, poruka)).then((info: any) => {
            if (p.test == true) {
                console.log('Mejl za ' + poruka.to + ' poslat na test server (Ethereal), pregled: ' + nodemailer.getTestMessageUrl(info))
            }
            else {
                console.log('Mejl poslat na ' + poruka.to + ': ' + poruka.subject)
            }
            return info
        })
    })
}

export const posaljiFakturu = (primalac: string, id_fakture: number, putanja: string) => {
    return posalji({
        to: primalac,
        subject: 'Faktura br. ' + id_fakture + ' - Printing House',
        text: 'Postovani,\n\nu prilogu se nalazi faktura br. ' + id_fakture + ' za Vasu narudzbinu.\n\nHvala na poverenju,\nPrinting House',
        attachments: [{ filename: 'faktura_' + id_fakture + '.pdf', path: putanja }]
    })
}

export const posaljiObavestenje = (primalac: string, naslov: string, tekst: string) => {
    return posalji({
        to: primalac,
        subject: naslov,
        text: tekst
    })
}

export const posaljiLinkZaLozinku = (primalac: string, link: string) => {
    return posalji({
        to: primalac,
        subject: 'Postavljanje nove lozinke - Printing House',
        text: 'Postovani,\n\nzatrazili ste postavljanje nove lozinke. Otvorite sledeci link i unesite novu lozinku:\n\n' + link +
            '\n\nLink vazi 5 minuta. Ako niste Vi zatrazili promenu, zanemarite ovu poruku.\n\nPrinting House'
    })
}
