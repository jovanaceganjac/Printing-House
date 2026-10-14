import { Routes } from '@angular/router';
import { Pocetna } from './pocetna/pocetna';
import { AdminPrijava } from './admin-prijava/admin-prijava';
import { Registracija } from './registracija/registracija';
import { ZaboravljenaLozinka } from './zaboravljena-lozinka/zaboravljena-lozinka';
import { NovaLozinka } from './nova-lozinka/nova-lozinka';
import { ProizvodDetalji } from './proizvod-detalji/proizvod-detalji';
import { ProizvodKlijent } from './proizvod-klijent/proizvod-klijent';
import { Priprema } from './priprema/priprema';
import { Placanje } from './placanje/placanje';
import { Klijent } from './klijent/klijent';
import { Stampar } from './stampar/stampar';
import { Administrator } from './administrator/administrator';
import { Arhiva } from './arhiva/arhiva';
import { JavneNabavke } from './javne-nabavke/javne-nabavke';
import { Narudzbine } from './narudzbine/narudzbine';
import { Pretraga } from './pretraga/pretraga';
import { Korpa } from './korpa/korpa';
import { MojiProizvodi } from './moji-proizvodi/moji-proizvodi';
import { NaruceniProizvodi } from './naruceni-proizvodi/naruceni-proizvodi';
import { Licitacije } from './licitacije/licitacije';
import { DodavanjeIzFajla } from './dodavanje-iz-fajla/dodavanje-iz-fajla';
import { NoviProizvod } from './novi-proizvod/novi-proizvod';
import { SviKorisnici } from './svi-korisnici/svi-korisnici';
import { KategorijeProizvoda } from './kategorije-proizvoda/kategorije-proizvoda';
import { Statistike } from './statistike/statistike';

export const routes: Routes = [
    {path: "", component: Pocetna},
    {path: "admin-prijava", component: AdminPrijava},
    {path: "registracija", component: Registracija},
    {path: "zaboravljena-lozinka", component: ZaboravljenaLozinka},
    {path: "nova-lozinka/:token", component: NovaLozinka},
    {path: "proizvod/:sifra", component: ProizvodDetalji},
    {path: "proizvod-klijent/:sifra", component: ProizvodKlijent},
    {path: "priprema/:sifra", component: Priprema},
    {path: "placanje", component: Placanje},
    {path: "klijent", component: Klijent},
    {path: "narudzbine", component: Narudzbine},
    {path: "pretraga", component: Pretraga},
    {path: "korpa", component: Korpa},
    {path: "arhiva", component: Arhiva},
    {path: "javne-nabavke", component: JavneNabavke},
    {path: "stampar", component: Stampar},
    {path: "moji-proizvodi", component: MojiProizvodi},
    {path: "naruceni-proizvodi", component: NaruceniProizvodi},
    {path: "licitacije", component: Licitacije},
    {path: "dodavanje-iz-fajla", component: DodavanjeIzFajla},
    {path: "novi-proizvod", component: NoviProizvod},
    {path: "administrator", component: Administrator},
    {path: "svi-korisnici", component: SviKorisnici},
    {path: "kategorije-proizvoda", component: KategorijeProizvoda},
    {path: "statistike", component: Statistike},
    {path: "**", redirectTo: ""}
];
