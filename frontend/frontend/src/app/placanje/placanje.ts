import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Faktura } from '../models/faktura';
import { FaktureServis } from '../services/fakture.servis';

@Component({
  selector: 'app-placanje',
  imports: [FormsModule],
  templateUrl: './placanje.html',
  styleUrl: './placanje.css',
})
export class Placanje {
  private ruter = inject(Router);
  private ruta = inject(ActivatedRoute);
  private faktureServis = inject(FaktureServis);

  kor_ime = "";
  fakture: Faktura[] = [];
  ukupno = 0;
  ucitano = false;
  placeno = false;

  tip = "Visa";
  broj = "";
  cvc = "";
  datum = "";

  porukaGreske = "";
  porukaUspeha = "";

  ngOnInit(): void {
    const sacuvan = localStorage.getItem("korisnik");
    if (sacuvan == null) {
      this.ruter.navigate([""]);
      return;
    }
    const prijavljen = JSON.parse(sacuvan);
    if (prijavljen.tip != "klijent_fizicko") {
      this.ruter.navigate([""]);
      return;
    }
    this.kor_ime = prijavljen.kor_ime;

    const parametar = this.ruta.snapshot.queryParamMap.get("fakture");
    const idjevi = parametar == null ? [] : parametar.split(",").map(id => Number(id));

    this.faktureServis.dohvatiFaktureKlijenta(this.kor_ime).subscribe(podaci => {
      this.fakture = podaci.filter(f => idjevi.indexOf(f.id_fakture) >= 0 && f.status == "naruceno");
      this.ukupno = 0;
      for (let i = 0; i < this.fakture.length; i++) {
        this.ukupno = this.ukupno + Number(this.fakture[i].ukupan_iznos);
      }
      this.ucitano = true;
    })
  }

  numerisaniProizvodi(f: Faktura) {
    return f.stavke.map((s, i) => (i + 1) + ". " + s.naziv + " (" + s.kolicina + ")").join(", ");
  }

  luhn(broj: string) {
    let zbir = 0;
    let parna = false;
    for (let i = broj.length - 1; i >= 0; i--) {
      let cifra = Number(broj.charAt(i));
      if (parna == true) {
        cifra = cifra * 2;
        if (cifra > 9) {
          cifra = cifra - 9;
        }
      }
      zbir = zbir + cifra;
      parna = !parna;
    }
    return zbir % 10 == 0;
  }

  plati() {
    this.porukaUspeha = "";
    const broj = this.broj.replace(/\s/g, "");

    if (this.tip == "") {
      this.porukaGreske = "Izaberite tip kartice.";
      return;
    }
    if (/^[0-9]{13,19}$/.test(broj) == false) {
      this.porukaGreske = "Broj kartice mora imati između 13 i 19 cifara.";
      return;
    }
    if (this.luhn(broj) == false) {
      this.porukaGreske = "Broj kartice nije ispravan.";
      return;
    }
    if (this.tip == "Visa" && broj.charAt(0) != "4") {
      this.porukaGreske = "Broj kartice ne odgovara tipu Visa (počinje cifrom 4).";
      return;
    }
    if (this.tip == "MasterCard" && /^(5[1-5]|2[2-7])/.test(broj) == false) {
      this.porukaGreske = "Broj kartice ne odgovara tipu MasterCard (počinje sa 51-55 ili 22-27).";
      return;
    }
    if (/^[0-9]{3,4}$/.test(this.cvc) == false) {
      this.porukaGreske = "CVC kod mora imati 3 ili 4 cifre.";
      return;
    }
    if (/^(0[1-9]|1[0-2])\/[0-9]{2}$/.test(this.datum) == false) {
      this.porukaGreske = "Datum isteka mora biti u obliku MM/GG.";
      return;
    }

    const mesec = Number(this.datum.substring(0, 2));
    const godina = 2000 + Number(this.datum.substring(3, 5));
    if (new Date(godina, mesec, 1) <= new Date()) {
      this.porukaGreske = "Kartica je istekla.";
      return;
    }

    const kartica = { tip: this.tip, broj: broj, cvc: this.cvc, datum: this.datum };
    const idjevi = this.fakture.map(f => f.id_fakture);

    this.faktureServis.platiFakture(this.kor_ime, idjevi, kartica).subscribe({
      next: () => {
        this.porukaGreske = "";
        this.placeno = true;
        this.porukaUspeha = "Plaćanje je uspešno. Fakture su u statusu plaćeno i prosleđene štampariji.";
        setTimeout(() => this.ruter.navigate(["narudzbine"]), 2500);
      },
      error: () => {
        this.porukaUspeha = "";
        this.porukaGreske = "Plaćanje nije uspelo, kartica je odbijena. Proverite podatke i pokušajte ponovo.";
      }
    })
  }

  nazad() {
    this.ruter.navigate(["narudzbine"]);
  }

}
