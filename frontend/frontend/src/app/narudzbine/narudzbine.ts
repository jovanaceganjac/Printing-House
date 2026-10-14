import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Faktura } from '../models/faktura';
import { FaktureServis } from '../services/fakture.servis';

@Component({
  selector: 'app-narudzbine',
  imports: [RouterLink],
  templateUrl: './narudzbine.html',
  styleUrl: './narudzbine.css',
})
export class Narudzbine {
  private ruter = inject(Router);
  private faktureServis = inject(FaktureServis);

  kor_ime = "";
  tip = "";

  fakture: Faktura[] = [];
  porukaFakture = "";
  sortiranoPo = "";
  rastuce = true;

  nazivStatusa(status: string) {
    const nazivi: any = {
      "naruceno": "naručeno", "placeno": "plaćeno", "u stampi": "u štampi", "isporuceno": "isporučeno", "primljeno": "primljeno",
      "otvorena": "otvorena", "zakljucena": "zaključena", "na cekanju": "na čekanju", "odobren": "odobren", "odbijen": "odbijen"
    };
    return nazivi[status] ? nazivi[status] : status;
  }

  ngOnInit(): void {
    const sacuvan = localStorage.getItem("korisnik");
    if (sacuvan == null) {
      this.ruter.navigate([""]);
      return;
    }
    const prijavljen = JSON.parse(sacuvan);
    if (String(prijavljen.tip).startsWith("klijent") == false) {
      this.ruter.navigate([""]);
      return;
    }
    this.kor_ime = prijavljen.kor_ime;
    this.tip = prijavljen.tip;

    this.faktureServis.dohvatiFaktureKlijenta(prijavljen.kor_ime).subscribe(podaci => {
      this.fakture = podaci;
      this.sortiranoPo = "";
      this.rastuce = true;
    })
  }

  putanjaPdf(f: Faktura) {
    return this.faktureServis.putanjaPdf(f.id_fakture);
  }

  numerisaniProizvodi(f: Faktura) {
    return f.stavke.map((s, i) => (i + 1) + ". " + s.naziv + " (" + s.kolicina + ")").join(", ");
  }

  formatDatum(d: any) {
    return new Date(d).toLocaleDateString("sr-RS");
  }

  plati(f: Faktura) {
    this.ruter.navigate(["placanje"], { queryParams: { fakture: String(f.id_fakture) } });
  }

  otkazi(f: Faktura) {
    if (confirm("Da li ste sigurni da želite da otkažete narudžbinu br. " + f.id_fakture + "?") == false) {
      return;
    }
    this.faktureServis.otkaziFakturu(f.id_fakture, this.kor_ime).subscribe({
      next: () => {
        this.porukaFakture = "";
        this.ngOnInit();
      },
      error: () => {
        this.porukaFakture = "Otkazivanje nije uspelo. Narudžbina više nije u statusu naručeno.";
      }
    })
  }

  primljeno(f: Faktura) {
    this.faktureServis.promeniStatus(f.id_fakture, "primljeno", this.kor_ime).subscribe({
      next: () => {
        this.porukaFakture = "";
        this.ngOnInit();
      },
      error: () => {
        this.porukaFakture = "Promena statusa nije uspela.";
      }
    })
  }

  sortiraj(kolona: string) {
    if (this.sortiranoPo == kolona) {
      this.rastuce = !this.rastuce;
    }
    else {
      this.sortiranoPo = kolona;
      this.rastuce = true;
    }
    this.fakture.sort((a, b) => {
      let rezultat = 0;
      if (kolona == "id") {
        rezultat = a.id_fakture - b.id_fakture;
      }
      else if (kolona == "stamparija") {
        rezultat = a.naziv_stamparije.localeCompare(b.naziv_stamparije);
      }
      else if (kolona == "grad") {
        rezultat = a.grad.localeCompare(b.grad);
      }
      else if (kolona == "datum") {
        rezultat = new Date(a.datum).getTime() - new Date(b.datum).getTime();
      }
      else if (kolona == "iznos") {
        rezultat = a.ukupan_iznos - b.ukupan_iznos;
      }
      else {
        rezultat = a.status.localeCompare(b.status);
      }
      if (this.rastuce == true) {
        return rezultat;
      }
      return -rezultat;
    })
  }

}
