import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Zaglavlje } from './zaglavlje/zaglavlje';
import { Podnozje } from './podnozje/podnozje';


@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Zaglavlje, Podnozje],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  title="New app"
}
