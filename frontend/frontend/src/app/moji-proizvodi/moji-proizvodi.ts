import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Korisnik } from '../models/korisnik';
import { Proizvod } from '../models/proizvod';
import { KorisniciServis } from '../services/korisnici.servis';
import { ProizvodiServis } from '../services/proizvodi.servis';
import { API } from '../services/api';

@Component({
  selector: 'app-moji-proizvodi',
  imports: [FormsModule, RouterLink],
  templateUrl: './moji-proizvodi.html',
  styleUrl: './moji-proizvodi.css',
})
export class MojiProizvodi {
  private ruter = inject(Router);
  private korisniciServis = inject(KorisniciServis);
  private proizvodiServis = inject(ProizvodiServis);

  api = API;
  korisnik: Korisnik = new Korisnik();

  proizvodi: Proizvod[] = [];
  noveKolicine: any = {};
  porukaProizvodi = "";
  porukaProizvodiUspeh = "";
  uvezeneSifre: string[] = [];
  slikeProizvoda: any = {};

  uslugaZaSifru = "";
  novaUsluga: any = { tip_stampe: "", dodatna_cena_po_komadu: 0, max_sirina_mm: 0, max_visina_mm: 0 };
  porukaUsluga = "";
  porukaUslugaUspeh = "";

  ngOnInit(): void {
    const sacuvan = localStorage.getItem("korisnik");
    if (sacuvan == null) {
      this.ruter.navigate([""]);
      return;
    }
    const prijavljen = JSON.parse(sacuvan);
    if (prijavljen.tip != "stampar") {
      this.ruter.navigate([""]);
      return;
    }

    const uvezene = localStorage.getItem("uvezene_sifre");
    if (uvezene != null) {
      this.uvezeneSifre = JSON.parse(uvezene);
    }

    this.korisniciServis.dohvatiKorisnika(prijavljen.kor_ime).subscribe(podaci => {
      if (podaci == null) {
        return;
      }
      this.korisnik = podaci;
    })

    this.proizvodiServis.dohvatiProizvodeStampara(prijavljen.kor_ime).subscribe(podaci => {
      this.proizvodi = podaci;
      this.noveKolicine = {};
      for (let i = 0; i < podaci.length; i++) {
        this.noveKolicine[podaci[i].sifra] = podaci[i].kolicina_na_lageru;
      }
    })
  }

  uslugeProizvoda(p: Proizvod) {
    return p.usluge_stampe.map(u => u.tip_stampe).join(", ");
  }

  sacuvajKolicinu(p: Proizvod) {
    const nova = Number(this.noveKolicine[p.sifra]);

    if (isNaN(nova) || nova < 0) {
      this.porukaProizvodi = "Količina mora biti broj veći ili jednak nuli.";
      return;
    }
    this.porukaProizvodi = "";
    this.proizvodiServis.azurirajKolicinu(p.sifra, nova, this.korisnik.kor_ime).subscribe({
      next: () => {
        this.ngOnInit();
      },
      error: () => {
        this.porukaProizvodi = "Ažuriranje količine nije uspelo.";
      }
    })
  }

  obrisi(p: Proizvod) {
    if (confirm("Da li ste sigurni da želite da obrišete proizvod " + p.naziv + "?") == false) {
      return;
    }
    this.proizvodiServis.obrisiProizvod(p.sifra, this.korisnik.kor_ime).subscribe({
      next: () => {
        this.ngOnInit();
      },
      error: () => {
        this.porukaProizvodi = "Brisanje proizvoda nije uspelo.";
      }
    })
  }

  izaberiSlikuProizvoda(dogadjaj: any, p: Proizvod) {
    if (dogadjaj.target.files.length == 0) {
      return;
    }
    this.slikeProizvoda[p.sifra] = dogadjaj.target.files[0];
  }

  sacuvajSliku(p: Proizvod) {
    const datoteka = this.slikeProizvoda[p.sifra];

    if (datoteka == null) {
      this.porukaProizvodi = "Prvo izaberite sliku.";
      return;
    }

    this.porukaProizvodiUspeh = "";
    this.proizvodiServis.upload(datoteka).subscribe(podaci => {
      if (podaci == null) {
        this.porukaProizvodi = "Dozvoljeni formati slike su JPG, PNG i GIF, najviše 5 MB.";
        return;
      }
      this.proizvodiServis.azurirajSliku(p.sifra, this.korisnik.kor_ime, podaci.putanja).subscribe({
        next: () => {
          this.porukaProizvodi = "";
          this.porukaProizvodiUspeh = "Glavna slika je sačuvana za " + p.naziv + ".";
          delete this.slikeProizvoda[p.sifra];
          this.ngOnInit();
        },
        error: () => {
          this.porukaProizvodi = "Čuvanje slike nije uspelo.";
        }
      })
    })
  }

  sacuvajDodatnuSliku(p: Proizvod) {
    const datoteka = this.slikeProizvoda[p.sifra];
    this.porukaProizvodiUspeh = "";

    if (datoteka == null) {
      this.porukaProizvodi = "Prvo izaberite sliku.";
      return;
    }
    if (p.dodatne_slike.length >= 3) {
      this.porukaProizvodi = "Proizvod već ima 3 dodatne slike.";
      return;
    }

    this.proizvodiServis.upload(datoteka).subscribe(podaci => {
      if (podaci == null) {
        this.porukaProizvodi = "Dozvoljeni formati slike su JPG, PNG i GIF, najviše 5 MB.";
        return;
      }
      this.proizvodiServis.dodajDodatnuSliku(p.sifra, this.korisnik.kor_ime, podaci.putanja).subscribe({
        next: () => {
          this.porukaProizvodi = "";
          this.porukaProizvodiUspeh = "Dodatna slika je sačuvana za " + p.naziv + ".";
          delete this.slikeProizvoda[p.sifra];
          this.ngOnInit();
        },
        error: () => {
          this.porukaProizvodi = "Čuvanje slike nije uspelo.";
        }
      })
    })
  }

  ukloniDodatnuSlikuProizvoda(p: Proizvod, slika: string) {
    if (confirm("Da li želite da uklonite ovu sliku?") == false) {
      return;
    }
    this.porukaProizvodiUspeh = "";
    this.proizvodiServis.ukloniDodatnuSliku(p.sifra, this.korisnik.kor_ime, slika).subscribe({
      next: () => {
        this.porukaProizvodi = "";
        this.ngOnInit();
      },
      error: () => {
        this.porukaProizvodi = "Uklanjanje slike nije uspelo.";
      }
    })
  }

  dodajUsluguPostojecem() {
    this.porukaUslugaUspeh = "";
    const u = this.novaUsluga;

    if (this.uslugaZaSifru == "") {
      this.porukaUsluga = "Izaberite proizvod.";
      return;
    }
    if (String(u.tip_stampe).trim() == "") {
      this.porukaUsluga = "Tip štampe ne sme biti prazan.";
      return;
    }
    if (isNaN(Number(u.dodatna_cena_po_komadu)) || Number(u.dodatna_cena_po_komadu) < 0) {
      this.porukaUsluga = "Dodatna cena po komadu ne sme biti negativna.";
      return;
    }
    if (isNaN(Number(u.max_sirina_mm)) || Number(u.max_sirina_mm) <= 0 || isNaN(Number(u.max_visina_mm)) || Number(u.max_visina_mm) <= 0) {
      this.porukaUsluga = "Maksimalna širina i visina moraju biti veće od nule.";
      return;
    }

    this.proizvodiServis.dodajUslugu(this.uslugaZaSifru, this.korisnik.kor_ime, u).subscribe({
      next: () => {
        this.porukaUsluga = "";
        this.porukaUslugaUspeh = "Usluga \"" + String(u.tip_stampe).trim() + "\" je dodata.";
        this.novaUsluga = { tip_stampe: "", dodatna_cena_po_komadu: 0, max_sirina_mm: 0, max_visina_mm: 0 };
        this.ngOnInit();
      },
      error: () => {
        this.porukaUsluga = "Dodavanje usluge nije uspelo. Možda proizvod već ima tu vrstu štampe.";
      }
    })
  }

}
