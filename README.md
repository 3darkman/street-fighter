# Street Fighter RPG System

Sistema de RPG baseado no universo Street Fighter para Foundry VTT v13.

## Autor

**Kirlian Silvestre**

## Versão

1.0.0

## Compatibilidade

- Foundry VTT v13+

## Descrição

Este sistema permite jogar campanhas de RPG ambientadas no universo de Street Fighter, com regras personalizadas para combate, golpes especiais, combos e muito mais.

## Características

### Tipos de Atores

- **Lutador (Fighter)**: Personagem jogador completo com todos os atributos e recursos
- **NPC**: Personagens não-jogadores simplificados com nível de ameaça

### Atributos

- **Força (Strength)**: Poder físico e dano corpo-a-corpo
- **Destreza (Dexterity)**: Agilidade e precisão
- **Vigor (Stamina)**: Resistência e pontos de vida
- **Inteligência (Intelligence)**: Conhecimento e estratégia
- **Raciocínio (Wits)**: Reflexos e iniciativa
- **Foco (Focus)**: Concentração e controle de Chi

### Recursos

- **Saúde (Health)**: Pontos de vida do personagem
- **Chi**: Energia para golpes especiais
- **Super**: Barra de super para golpes devastadores
- **Força de Vontade (Willpower)**: Determinação mental

### Tipos de Itens

- **Manobra (Maneuver)**: Golpes básicos (socos, chutes, agarrões)
- **Golpe Especial (Special Move)**: Hadouken, Shoryuken, etc.
- **Combo**: Sequências de golpes encadeados
- **Técnica (Technique)**: Habilidades passivas e ativas
- **Equipamento (Equipment)**: Itens e acessórios
- **Estilo (Style)**: Estilos de luta (Shotokan, Muay Thai, etc.)

## Estrutura do Projeto

```
street-fighter/
├── module/
│   ├── config/
│   │   ├── config.mjs
│   │   └── settings.mjs
│   ├── documents/
│   │   ├── actor.mjs
│   │   └── item.mjs
│   ├── sheets/
│   │   ├── actor-sheet.mjs
│   │   └── item-sheet.mjs
│   ├── combat/
│   │   ├── combat.mjs
│   │   └── combatant.mjs
│   ├── helpers/
│   │   ├── templates.mjs
│   │   └── handlebars-helpers.mjs
│   └── street-fighter.mjs
├── templates/
│   ├── actor/
│   │   ├── actor-fighter-sheet.hbs
│   │   ├── actor-npc-sheet.hbs
│   │   └── partials/
│   ├── item/
│   │   └── partials/
│   └── chat/
├── styles/
│   └── street-fighter.css
├── lang/
│   ├── pt-BR.json
│   └── en.json
├── assets/
│   └── images/
├── system.json
├── template.json
├── README.md
└── LICENSE
```

## Instalação

1. Copie a pasta `street-fighter` para `Data/systems/` do seu Foundry VTT
2. Reinicie o Foundry VTT
3. Crie um novo mundo selecionando "Street Fighter RPG" como sistema

## Arquitetura

O projeto segue os princípios de:

- **Clean Code**: Código legível, bem documentado e organizado
- **Clean Architecture**: Separação clara de responsabilidades
- **SSOT (Single Source of Truth)**: Configurações centralizadas em `config.mjs`

## Licença

MIT License - Veja o arquivo LICENSE para mais detalhes.

## Contribuição

Contribuições são bem-vindas! Por favor, abra uma issue ou pull request.

## Changelog

### 1.0.0
- Versão inicial do sistema
- Suporte a Foundry VTT v13
- Fichas de Lutador e NPC
- Sistema de combate com Chi e Super
- Manobras, golpes especiais e combos
- Suporte a Português (Brasil) e Inglês
