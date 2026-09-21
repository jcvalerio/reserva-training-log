# Progreso: revision UX y criterio de entrenamiento

Fecha de consulta: 2026-09-09. Revision de codigo, tres investigaciones web en
documentacion oficial, y dos revisiones independientes con roles de diseno UX
y entrenamiento. Estos roles son analisis del producto, no consultas con
profesionales externos ni un estudio con participantes.

## Problema

La pantalla obligaba a leer resumen, veredictos musculares, ranking de mejoras,
pruebas, medidas, volumen, equilibrio, dolor, todos los ejercicios, consistencia
y todas las sesiones. El titulo prometia historial, pero este aparecia al final.
Ocultar algunos bloques con acordeones habia reducido su altura, sin reducir
la cantidad de decisiones.

El mapa ya aceptaba pulsaciones, pero solo cambiaba una etiqueta. No conectaba
el grupo muscular con la evidencia que el usuario queria revisar.

## Tres investigaciones

1. **Hevy: distribucion del entrenamiento.** Su documentacion muestra un mapa
   corporal y series por grupo, con estadisticas mas profundas en otros niveles.
   Adoptamos la distribucion muscular como lectura principal. No copiamos su
   inventario de estadisticas, informes y clasificaciones: devolveria la
   sobrecarga que estamos quitando. El mapa como filtro directo es nuestra
   propuesta; la fuente no demuestra que Hevy tenga esa interaccion.
   [Estadisticas de Hevy](https://help.hevyapp.com/hc/en-us/articles/35702030346903-Hevy-Statistics-Explained-Track-Your-Training-Progress-and-Muscle-Growth).

2. **Strong: detalle solicitado y consistencia.** Documenta historial, graficas
   y records dentro del ejercicio, y un widget de sesiones semanales con meta.
   Adoptamos abrir una grafica al elegir un ejercicio y conservar consistencia.
   Un dashboard configurable requeriria configuracion y mas alcance; no hace
   falta para resolver esta queja.
   [Detalle del ejercicio](https://help.strongapp.io/article/237-about-exercise-detail),
   [Widgets](https://help.strongapp.io/article/239-profile-widgets).

3. **FitNotes: recuperar entrenamientos.** Documenta calendario y lista
   cronologica, con filtros por categoria o ejercicio y acceso al entrenamiento.
   Adoptamos una vista de historial separada y la idea de reducir resultados
   por grupo. Elegimos lista sobre calendario: facilita encontrar una sesion
   por nombre y fecha sin anadir otro grafico. El filtro muscular se aplica
   a los ejercicios de Progreso; no hemos anadido filtros al historial.
   [Calendario e historial](https://www.fitnotesapp.com/calendar/),
   [Seguimiento del progreso](https://www.fitnotesapp.com/progress_tracking/).

Son paginas oficiales accesibles al consultar en 2026. Algunas, como las de
Strong, se actualizaron en 2021. Esto verifica patrones documentados, no que
se hayan estrenado en 2026 ni que hayamos probado sus aplicaciones nativas.

## Debate y decision

| Alternativa | Ventaja | Coste | Decision |
|---|---|---|---|
| Conservar todo en acordeones | Poco cambio | Mantiene muchas entradas y preguntas | Descartada |
| Separar cada metrica en una pestana | Menos scroll | Muchos destinos sin tarea clara | Descartada |
| Dashboard configurable | Preferencias individuales | Configuracion y alcance extra | Descartada |
| Resumen, filtro muscular y un historial separado | Cada seleccion reduce lo que hay que leer | Un paso para abrir ejercicios | Elegida |

La revision UX prioriza reconocer y encontrar. La de entrenamiento prioriza
adherencia, distribucion y evidencia por ejercicio. La sintesis conserva tres
bloques principales y convierte el mapa en acceso al detalle.

| Elemento anterior | Resultado | Motivo |
|---|---|---|
| KPI | Conservar | Resumen compacto que el usuario valora |
| Series por grupo | Conservar y filtrar | Conecta trabajo muscular con ejercicios |
| Consistencia | Conservar | Permite revisar frecuencia frente a la meta |
| Esta funcionando | Retirar | Duplica y sobreinterpreta cambios entre sesiones |
| Ranking de mejoras | Retirar | Repite el KPI y compite con la evidencia |
| Tendencia corporal | Retirar del resumen | Mediciones conserva su propio destino |
| Simetria y capacidad | Retirar del resumen | Las pruebas ya se revisan en Mediciones |
| Dolor agregado | Retirar del resumen | Maximos historicos sin contexto temporal |
| Todos los ejercicios | Sustituir por seleccion | La evidencia sirve; el inventario abruma |
| Equilibrio agregado | Retirar | Otra lectura sin accion clara en este flujo |
| Historial completo | Vista dedicada | Recuperar una sesion es una tarea distinta |

Los KPI se mantienen con su significado existente. Mejorando cuenta cambios
que cumplen el criterio del sistema frente a la sesion anterior; no demuestra
crecimiento muscular. Carga es duracion por RPE de sesion, promediada sobre las
sesiones recientes; no son kilogramos levantados. El refactor no cambia formulas
de progresion, registros de dolor ni los campos de ninguna serie.

## Comportamiento

- El mapa y el selector HTML comparten un grupo activo. El selector ofrece un
  camino accesible para los musculos pequenos y los ejercicios sin clasificar.
- Se incluyen musculos principales y secundarios, con la clasificacion del
  propio ejercicio sustituto. Las series efectivas mantienen sus reglas.
- Un grupo seleccionado muestra solo su volumen y ejercicios relacionados.
  Las graficas se abren de una en una, inicialmente cerradas.
- El periodo controla volumen y mapa. El detalle indica explicitamente
  ultimas sesiones de todos los periodos: conserva las ultimas 12 instancias
  por ejercicio, necesarias para ver una progresion fuera de la semana actual.
- Quitar el filtro vuelve a la distribucion completa. Los grupos sin historial
  muestran un estado vacio; no se inventa un resultado.
- El historial autentica al usuario, carga solo su perfil y muestra primero
  12 sesiones; Ver mas revela las siguientes. Esto limita el render inicial,
  no es paginacion de base de datos.
- La vista de resumen ofrece un enlace a Mediciones y pruebas.

## Limites

La validacion local usa el historial de desarrollo, que puede incluir datos
sinteticos. La documentacion de competidores y la revision heuristica no
sustituyen una prueba de uso. El paso pendiente de campo es abrir la preview
en un iPhone real y comprobar pulsaciones pequenas, scroll y lectura durante
una consulta normal del historial.
