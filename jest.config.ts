import type { Config } from 'jest';
import { pathsToModuleNameMapper } from 'ts-jest';
import ts from 'typescript';

// Path aliases (e.g. the ones added by `nest g library`) live in tsconfig.json,
// so they are read from there instead of being duplicated here.
const { config: tsconfig } = ts.readConfigFile('./tsconfig.json', ts.sys.readFile);
const paths = tsconfig?.compilerOptions?.paths ?? {};

const config: Config = {
    moduleFileExtensions: ['js', 'json', 'ts'],
    rootDir: '.',
    testRegex: '.*\\.spec\\.ts$',
    transform: {
        // 빌드 설정은 src만 내보내지만 테스트는 프로젝트 전체를 컴파일하므로 rootDir를 넓힌다
        ['^.+\\.(t|j)s$']: ['ts-jest', { tsconfig: { rootDir: '.', declaration: false } }],
    },
    moduleNameMapper: {
        '^@core/(.*)$': '<rootDir>/src/core/$1',
        '^@adapter/(.*)$': '<rootDir>/src/adapter/$1',
        '^@global/(.*)$': '<rootDir>/src/global/$1',
    },
    collectCoverageFrom: ['src/**/*.(t|j)s', 'libs/**/*.(t|j)s', 'apps/**/*.(t|j)s'],
    coverageDirectory: './coverage',
    testEnvironment: 'node',
};

export default config;
