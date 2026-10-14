import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { KorisniciServis } from '../services/korisnici.servis';

@Component({
  selector: 'app-nova-lozinka',
  imports: [FormsModule],
  templateUrl: './nova-lozinka.html',
  styleUrl: './nova-lozinka.css',
})
export class NovaLozinka {
  private korisniciServis = inject(KorisniciServis);
  private ruter = inject(Router);
  private ruta = inject(ActivatedRoute);

  token = "";
  lozinka = "";
  potvrdaLozinke = "";

  porukaGreske = "";
  porukaUspeha = "";

  ngOnInit(): void {
    this.token = this.ruta.snapshot.paramMap.get("token")!;
  }

  postavi() {
    const lozinkaRegex = /^(?=.*[A-Z])(?=.*[0-9])(?=.*[^A-Za-z0-9])[A-Za-z].{7,11}$/;

    this.porukaUspeha = "";

    if (lozinkaRegex.test(this.lozinka) == false) {
      this.porukaGreske = "Lozinka mora imati 8 do 12 karaktera, bar jedno veliko slovo, jednu cifru i jedan specijalni karakter, i mora počinjati slovom.";
      return;
    }
    if (this.lozinka != this.potvrdaLozinke) {
      this.porukaGreske = "Lozinka i potvrda lozinke se ne poklapaju.";
      return;
    }

    this.korisniciServis.postaviNovuLozinku(this.token, this.lozinka).subscribe({
      next: () => {
        this.porukaGreske = "";
        this.porukaUspeha = "Lozinka je uspešno promenjena.";
        setTimeout(() => this.ruter.navigate([""]), 2000);
      },
      error: () => {
        this.porukaUspeha = "";
        this.porukaGreske = "Link je istekao ili nije ispravan";
      }
    })
  }

}
