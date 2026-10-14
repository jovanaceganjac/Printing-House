import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Korisnik } from '../models/korisnik';
import { FaktureServis } from '../services/fakture.servis';
import Chart from 'chart.js/auto';

const boje = ['#0E2A47', '#009EE0', '#D6006E', '#FFCE00', '#1B7F4B', '#667486', '#007AAD', '#E8730C'];

@Component({
  selector: 'app-statistike',
  imports: [RouterLink],
  templateUrl: './statistike.html',
  styleUrl: './statistike.css',
})
export class Statistike {
  private ruter = inject(Router);
  private faktureServis = inject(FaktureServis);

  korisnik: Korisnik = new Korisnik();

  statPromet: any[] = [];
  statNaruceni: any[] = [];
  statOcene: any[] = [];

  grafikonPromet: any = null;
  grafikonNaruceni: any = null;
  grafikonOcene: any = null;
  prikazaniUOcenama: any = {};

  ngOnInit(): void {
    const sacuvan = localStorage.getItem("korisnik");
    if (sacuvan == null) {
      this.ruter.navigate([""]);
      return;
    }
    const prijavljen = JSON.parse(sacuvan);
    if (prijavljen.tip != "admin") {
      this.ruter.navigate([""]);
      return;
    }
    this.korisnik = prijavljen;

    this.faktureServis.statistikaPromet().subscribe(podaci => {
      this.statPromet = podaci;
      setTimeout(() => this.nacrtajPromet(), 0);
    })

    this.faktureServis.statistikaNaruceni().subscribe(podaci => {
      this.statNaruceni = podaci;
      setTimeout(() => this.nacrtajNaruceni(), 0);
    })

    this.faktureServis.statistikaOcene().subscribe(podaci => {
      this.statOcene = podaci;
      this.prikazaniUOcenama = {};
      for (let i = 0; i < podaci.length; i++) {
        this.prikazaniUOcenama[podaci[i].sifra] = i < 5;
      }
      setTimeout(() => this.nacrtajOcene(), 0);
    })
  }

  nacrtajPromet(pokusaj: number = 0) {
    if (this.grafikonPromet != null) {
      this.grafikonPromet.destroy();
      this.grafikonPromet = null;
    }
    if (this.statPromet.length == 0) {
      return;
    }
    const platno: any = document.getElementById("grafikonPromet");
    if (platno == null || platno.parentElement.offsetWidth == 0) {
      if (pokusaj < 40) {
        setTimeout(() => this.nacrtajPromet(pokusaj + 1), 50);
      }
      return;
    }

    this.grafikonPromet = new Chart(platno, {
      type: 'bar',
      data: {
        labels: this.statPromet.map(s => s.naziv_stamparije),
        datasets: [{
          label: 'Promet u dinarima',
          data: this.statPromet.map(s => s.iznos),
          backgroundColor: boje[0]
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: { beginAtZero: true, title: { display: true, text: 'Iznos (din)' } },
          x: { title: { display: true, text: 'Štamparija' } }
        }
      }
    })
  }

  nacrtajNaruceni(pokusaj: number = 0) {
    if (this.grafikonNaruceni != null) {
      this.grafikonNaruceni.destroy();
      this.grafikonNaruceni = null;
    }
    if (this.statNaruceni.length == 0) {
      return;
    }
    const platno: any = document.getElementById("grafikonNaruceni");
    if (platno == null || platno.parentElement.offsetWidth == 0) {
      if (pokusaj < 40) {
        setTimeout(() => this.nacrtajNaruceni(pokusaj + 1), 50);
      }
      return;
    }

    this.grafikonNaruceni = new Chart(platno, {
      type: 'pie',
      data: {
        labels: this.statNaruceni.map(s => s.naziv + " (" + s.procenat + "%)"),
        datasets: [{
          label: 'Naručeno komada',
          data: this.statNaruceni.map(s => s.kolicina),
          backgroundColor: this.statNaruceni.map((s, i) => boje[i % boje.length])
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'right' } }
      }
    })
  }

  nacrtajOcene(pokusaj: number = 0) {
    if (this.grafikonOcene != null) {
      this.grafikonOcene.destroy();
      this.grafikonOcene = null;
    }
    if (this.statOcene.length == 0) {
      return;
    }
    const platno: any = document.getElementById("grafikonOcene");
    if (platno == null || platno.parentElement.offsetWidth == 0) {
      if (pokusaj < 40) {
        setTimeout(() => this.nacrtajOcene(pokusaj + 1), 50);
      }
      return;
    }

    const izabrani = this.statOcene.filter(p => this.prikazaniUOcenama[p.sifra] == true);

    this.grafikonOcene = new Chart(platno, {
      type: 'line',
      data: {
        labels: this.statOcene[0].tacke.map((t: any) => t.mesec),
        datasets: izabrani.map(p => {
          const i = this.statOcene.indexOf(p);
          return {
            label: p.naziv,
            data: p.tacke.map((t: any) => t.prosek),
            borderColor: boje[i % boje.length],
            backgroundColor: boje[i % boje.length],
            fill: false
          }
        })
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: { min: -1, max: 1, title: { display: true, text: 'Prosečna ocena' } },
          x: { title: { display: true, text: 'Mesec' } }
        }
      }
    })
  }

  promeniPrikazOcene(sifra: string, dogadjaj: any) {
    this.prikazaniUOcenama[sifra] = dogadjaj.target.checked;
    this.nacrtajOcene();
  }

  prikaziSveOcene(prikazi: boolean) {
    for (let i = 0; i < this.statOcene.length; i++) {
      this.prikazaniUOcenama[this.statOcene[i].sifra] = prikazi;
    }
    this.nacrtajOcene();
  }

}
